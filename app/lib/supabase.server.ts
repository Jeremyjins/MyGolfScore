// Supabase Server Client for Cloudflare Workers with SSR Authentication
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

// Cloudflare Workers 환경에서의 환경변수 타입
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// Service Role 클라이언트 캐시
let serviceRoleClient: SupabaseClient<Database> | null = null;

/**
 * Create Supabase client for SSR with cookie handling
 * Use this for authenticated operations (respects RLS)
 */
export function createSupabaseServerClient(request: Request, env: Env) {
  const parsedCookies = parseCookieHeader(request.headers.get('Cookie') ?? '');
  // Ensure value is always a string (required by @supabase/ssr types)
  const cookies = parsedCookies.map((c) => ({
    name: c.name,
    value: c.value ?? '',
  }));
  const headers = new Headers();

  const supabase = createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookies;
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options)
            );
          });
        },
      },
    }
  );

  return { supabase, headers };
}

/**
 * Create Supabase client with service role key
 * Use this for admin operations that bypass RLS
 * WARNING: Only use on server-side, never expose to client
 */
export function getServiceRoleClient(env: Env): SupabaseClient<Database> {
  if (!serviceRoleClient) {
    serviceRoleClient = createClient<Database>(
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
  return serviceRoleClient;
}

// React Router 7 context에서 환경변수 가져오기
export function getEnvFromContext(context: unknown): Env {
  const ctx = context as { cloudflare?: { env?: Env } };
  const env = ctx?.cloudflare?.env;

  if (!env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)');
  }

  return env;
}

// Legacy alias for backward compatibility during migration
export function getSupabase(env: Env): SupabaseClient<Database> {
  return getServiceRoleClient(env);
}
