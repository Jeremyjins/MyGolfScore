// Authentication utilities for server-side with Supabase Auth
import { redirect } from 'react-router';
import { createSupabaseServerClient, type Env } from './supabase.server';

// ============================================
// Auth Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthProfile {
  name: string;
}

export interface AuthSession {
  user: AuthUser;
  profile: AuthProfile;
}

export interface AuthResult {
  session: AuthSession | null;
  headers: Headers;
  supabase: ReturnType<typeof createSupabaseServerClient>['supabase'];
}

// ============================================
// Auth Functions
// ============================================

/**
 * Get current auth session (returns null if not authenticated)
 */
export async function getAuthSession(
  request: Request,
  env: Env
): Promise<AuthResult> {
  const { supabase, headers } = createSupabaseServerClient(request, env);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { session: null, headers, supabase };
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  return {
    session: {
      user: {
        id: user.id,
        email: user.email!,
      },
      profile: {
        name: profile?.name || '사용자',
      },
    },
    headers,
    supabase,
  };
}

/**
 * Require authentication (throws redirect if not authenticated)
 */
export async function requireAuth(
  request: Request,
  env: Env
): Promise<Omit<AuthResult, 'session'> & { session: AuthSession }> {
  const result = await getAuthSession(request, env);

  if (!result.session) {
    throw redirect('/auth/login', { headers: result.headers });
  }

  return result as Omit<AuthResult, 'session'> & { session: AuthSession };
}

/**
 * Redirect if already authenticated
 */
export async function redirectIfAuthenticated(
  request: Request,
  env: Env,
  redirectTo: string = '/home'
): Promise<{ headers: Headers }> {
  const { session, headers } = await getAuthSession(request, env);

  if (session) {
    throw redirect(redirectTo, { headers });
  }

  return { headers };
}

/**
 * Sign out the current user
 */
export async function signOut(
  request: Request,
  env: Env
): Promise<{ headers: Headers }> {
  const { supabase, headers } = createSupabaseServerClient(request, env);
  await supabase.auth.signOut();
  return { headers };
}
