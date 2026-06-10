import { supabase } from './supabase';
import { useStore } from './store';

/**
 * Background cloud sync (Phase 1: single JSON document, last-write-wins by time).
 *
 * - App hydrates instantly from localStorage (no UI change).
 * - On boot we compare a local modified-time against the cloud row's updated_at:
 *     · cloud missing            → push local up (first-run migration)
 *     · local newer than cloud   → keep local, push it (don't let a stale cloud
 *                                  copy clobber edits made offline)
 *     · cloud newer/equal        → adopt cloud as the source of truth
 * - Every subsequent local change bumps the local mtime and is debounced up.
 *
 * No-ops entirely when Supabase isn't configured.
 */

const TABLE = 'app_state';
const ROW_ID = 'singleton'; // becomes per-user once auth is added
const MTIME_KEY = 'tracker:mtime';

let lastSynced = '';
let timer: ReturnType<typeof setTimeout> | null = null;
let applying = false; // suppress the self-trigger while adopting cloud data
let status: 'off' | 'syncing' | 'ok' | 'error' = 'off';

export const cloudStatus = () => status;

const localMtime = (): number => Number(localStorage.getItem(MTIME_KEY) || '0');
const setMtime = (n: number) => localStorage.setItem(MTIME_KEY, String(n));

export async function initCloudSync(): Promise<void> {
  if (!supabase) return;
  status = 'syncing';
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data, updated_at')
      .eq('id', ROW_ID)
      .maybeSingle();
    if (error) throw error;

    if (data?.data) {
      const cloudM = data.updated_at ? Date.parse(data.updated_at) : 0;
      if (localMtime() > cloudM) {
        await push(); // local edits are newer — keep them, upload
      } else {
        adopt(JSON.stringify(data.data), cloudM); // cloud wins
      }
    } else {
      await push(); // cloud empty — migrate local up
    }
    status = 'ok';
  } catch (e) {
    status = 'error';
    console.warn('[cloudSync] init failed, staying local:', (e as Error).message);
  }

  useStore.subscribe(() => {
    if (applying) return;
    setMtime(Date.now());
    schedulePush();
  });
}

function adopt(json: string, cloudM: number) {
  applying = true;
  try {
    const r = useStore.getState().importAll(json);
    if (!r.ok) throw new Error(r.error);
    lastSynced = useStore.getState().exportAll();
    setMtime(cloudM);
  } catch (e) {
    console.warn('[cloudSync] adopt failed:', (e as Error).message);
  } finally {
    applying = false;
  }
}

function schedulePush() {
  if (!supabase) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(push, 800);
}

async function push(): Promise<void> {
  if (!supabase) return;
  const json = useStore.getState().exportAll();
  if (json === lastSynced) return;
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id: ROW_ID, data: JSON.parse(json), updated_at: new Date().toISOString() });
    if (error) throw error;
    lastSynced = json;
    status = 'ok';
  } catch (e) {
    status = 'error';
    console.warn('[cloudSync] push failed:', (e as Error).message);
  }
}
