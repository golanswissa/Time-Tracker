import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client. Reads Vite env vars:
 *   VITE_SUPABASE_URL       — your project URL
 *   VITE_SUPABASE_ANON_KEY  — the public anon key (safe in the browser, RLS-protected)
 *
 * If either is missing, this is `null` and the app runs purely on localStorage —
 * so the build never breaks before the project is configured.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null;

export const isCloudEnabled = !!supabase;
