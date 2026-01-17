// Supabase Server Client for Cloudflare Workers
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

// Cloudflare Workers 환경에서의 환경변수 타입
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DEFAULT_USER_ID: string;
}

let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabase(env: Env): SupabaseClient<Database> {
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseClient;
}

// React Router 7 context에서 환경변수 가져오기
export function getEnvFromContext(context: unknown): Env {
  const ctx = context as { cloudflare?: { env?: Env } };
  const env = ctx?.cloudflare?.env;

  if (!env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  return env;
}

// 기본 사용자 ID 가져오기 (단일 사용자 앱)
export function getDefaultUserId(env: Env): string {
  return env.DEFAULT_USER_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
}
