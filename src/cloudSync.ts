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
// Once we've seen the cloud (or a successful push) hold real work, we refuse to
// ever overwrite it with an empty local state — the core data-loss guard.
let cloudHasRealData = false;

export const cloudStatus = () => status;

const localMtime = (): number => Number(localStorage.getItem(MTIME_KEY) || '0');
const setMtime = (n: number) => localStorage.setItem(MTIME_KEY, String(n));

/** Count of "real" records — used to stop the cloud shrinking/clobbering real local work. */
function realDataCount(s: {
  entries?: unknown[];
  invoices?: unknown[];
  quotes?: unknown[];
  scheduledTasks?: unknown[];
}): number {
  return (
    (s.entries?.length || 0) +
    (s.invoices?.length || 0) +
    (s.quotes?.length || 0) +
    (s.scheduledTasks?.length || 0)
  );
}

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
      const localReal = realDataCount(useStore.getState());
      const cloudReal = realDataCount(data.data);
      if (cloudReal > 0) cloudHasRealData = true;
      if (localReal > cloudReal) {
        // SAFETY: local holds more real records than the cloud — never let the
        // cloud shrink your data (covers an empty OR a stale/partial cloud copy).
        // Keep local and push it up as the source of truth.
        console.info(`[cloudSync] keeping local: it has ${localReal} records vs cloud's ${cloudReal}`);
        await push();
      } else if (localMtime() > cloudM) {
        await push(); // local edits are newer — keep them, upload
      } else {
        adopt(JSON.stringify(data.data), cloudM); // cloud is at least as complete and newer
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
  const state = useStore.getState();
  // SAFETY: once the cloud has held real work, never overwrite it with an empty
  // local state (guards against a boot-time race or an accidental reset wiping
  // the cloud row). Local stays as-is; we just don't propagate the emptiness.
  if (cloudHasRealData && realDataCount(state) === 0) {
    console.warn('[cloudSync] skipping push: refusing to overwrite cloud data with an empty local state');
    return;
  }
  const json = state.exportAll();
  if (json === lastSynced) return;
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id: ROW_ID, data: JSON.parse(json), updated_at: new Date().toISOString() });
    if (error) throw error;
    lastSynced = json;
    if (realDataCount(state) > 0) cloudHasRealData = true;
    status = 'ok';
  } catch (e) {
    status = 'error';
    console.warn('[cloudSync] push failed:', (e as Error).message);
  }
}
