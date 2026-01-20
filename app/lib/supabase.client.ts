// Supabase Browser Client for Client-Side Authentication
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '~/types/database';

// Global type declaration for window.ENV
declare global {
  interface Window {
    ENV: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}

// Singleton browser client
let supabase: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Get Supabase client for browser environment
 * Must be called only in client-side code (useEffect, event handlers, etc.)
 */
export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error(
      'getSupabaseBrowserClient can only be called in browser environment'
    );
  }

  if (!window.ENV?.SUPABASE_URL || !window.ENV?.SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase environment variables not found. Make sure ENV is passed from server.'
    );
  }

  if (!supabase) {
    supabase = createBrowserClient<Database>(
      window.ENV.SUPABASE_URL,
      window.ENV.SUPABASE_ANON_KEY
    );
  }

  return supabase;
}

/**
 * Reset the browser client (useful for testing or logout)
 */
export function resetSupabaseBrowserClient() {
  supabase = null;
}
