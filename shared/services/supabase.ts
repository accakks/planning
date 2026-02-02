import { createClient, SupabaseClient } from '@supabase/supabase-js';

export let supabase: SupabaseClient = undefined as unknown as SupabaseClient;

export const initSupabase = (url: string, key: string, options: any = {}) => {
  if (!supabase) {
    supabase = createClient(url, key, options);
  }
  return supabase;
};

// Note: initSupabase MUST be called explicitly by the entry point (web/index.tsx or mobile/app/_layout.tsx)
// We removed import.meta fallback because it crashes Metro bundler at parse time.
