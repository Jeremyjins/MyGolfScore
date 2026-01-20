# My Golf Score - 이메일 인증 상세 구현 계획

> **생성일**: 2026-01-20
> **기반 문서**: my-golf-email-login-brainstorming
> **목적**: PIN 기반 → 이메일 기반 인증 마이그레이션 상세 구현 가이드

---

## 📦 의존성 설치

```bash
npm install @supabase/ssr @tanstack/react-query
```

---

## 🗄️ Phase 1: Database Migration (Supabase SQL Editor)

```sql
-- ============================================================
-- My Golf Score - Email Auth Migration
-- Execute in Supabase SQL Editor
-- ============================================================

-- 1. Remove PIN-related columns from profiles
ALTER TABLE profiles
  DROP COLUMN IF EXISTS pin_hash,
  DROP COLUMN IF EXISTS login_attempts,
  DROP COLUMN IF EXISTS lockout_level,
  DROP COLUMN IF EXISTS locked_until,
  DROP COLUMN IF EXISTS is_locked;

-- 2. Create trigger for auto profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', '사용자'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Migrate existing data to new auth user
DO $$
DECLARE
  old_id UUID;
  new_id UUID := 'fe010041-f90f-445d-91ac-ce8a69e00aef';
BEGIN
  SELECT id INTO old_id FROM profiles WHERE id != new_id LIMIT 1;
  
  IF old_id IS NOT NULL THEN
    UPDATE courses SET user_id = new_id WHERE user_id = old_id;
    UPDATE companions SET user_id = new_id WHERE user_id = old_id;
    UPDATE rounds SET user_id = new_id WHERE user_id = old_id;
    DELETE FROM profiles WHERE id = old_id;
  END IF;
  
  INSERT INTO profiles (id, name) 
  VALUES (new_id, '진대성')
  ON CONFLICT (id) DO UPDATE SET name = '진대성';
END $$;

-- 4. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
-- profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- courses
DROP POLICY IF EXISTS "courses_all" ON courses;
CREATE POLICY "courses_all" ON courses FOR ALL USING (user_id = auth.uid());

-- companions
DROP POLICY IF EXISTS "companions_all" ON companions;
CREATE POLICY "companions_all" ON companions FOR ALL USING (user_id = auth.uid());

-- rounds
DROP POLICY IF EXISTS "rounds_all" ON rounds;
CREATE POLICY "rounds_all" ON rounds FOR ALL USING (user_id = auth.uid());

-- round_players
DROP POLICY IF EXISTS "round_players_all" ON round_players;
CREATE POLICY "round_players_all" ON round_players FOR ALL 
  USING (round_id IN (SELECT id FROM rounds WHERE user_id = auth.uid()));

-- scores
DROP POLICY IF EXISTS "scores_all" ON scores;
CREATE POLICY "scores_all" ON scores FOR ALL 
  USING (round_player_id IN (
    SELECT rp.id FROM round_players rp
    JOIN rounds r ON rp.round_id = r.id
    WHERE r.user_id = auth.uid()
  ));

-- 6. Remove PIN-related functions
DROP FUNCTION IF EXISTS record_failed_login(UUID);
DROP FUNCTION IF EXISTS check_rate_limit(UUID);
DROP FUNCTION IF EXISTS record_successful_login(UUID);
DROP FUNCTION IF EXISTS reset_login_state(UUID);
```

---

## 🔧 Phase 2: Supabase Client Setup

### 2.1 app/lib/supabase.server.ts (REWRITE)

```typescript
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';
import type { AppLoadContext } from 'react-router';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export function getEnvFromContext(context: AppLoadContext): Env {
  const env = (context as { cloudflare?: { env?: Env } }).cloudflare?.env;
  if (!env) throw new Error('Environment not found');
  return env;
}

/**
 * Create Supabase client for SSR with cookie handling
 * Use this for authenticated operations (respects RLS)
 */
export function createSupabaseServerClient(request: Request, env: Env) {
  const cookies = parseCookieHeader(request.headers.get('Cookie') ?? '');
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
            headers.append('Set-Cookie', serializeCookieHeader(name, value, options));
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
 */
export function getServiceRoleClient(env: Env) {
  return createClient<Database>(
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
```

### 2.2 app/lib/supabase.client.ts (NEW)

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '~/types/database';

declare global {
  interface Window {
    ENV: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}

let supabase: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient can only be called in browser');
  }
  
  if (!supabase) {
    supabase = createBrowserClient<Database>(
      window.ENV.SUPABASE_URL,
      window.ENV.SUPABASE_ANON_KEY
    );
  }
  return supabase;
}
```

---

## 🔐 Phase 3: Auth Server Module

### 3.1 app/lib/auth.server.ts (REWRITE)

```typescript
import { redirect, json } from 'react-router';
import { createSupabaseServerClient, type Env } from './supabase.server';

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

/**
 * Get current auth session (returns null if not authenticated)
 */
export async function getAuthSession(
  request: Request, 
  env: Env
): Promise<AuthResult> {
  const { supabase, headers } = createSupabaseServerClient(request, env);
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
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
        email: user.email! 
      },
      profile: { 
        name: profile?.name || '사용자' 
      }
    },
    headers,
    supabase
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
) {
  const { session, headers } = await getAuthSession(request, env);
  
  if (session) {
    throw redirect(redirectTo, { headers });
  }
  
  return { headers };
}
```

---

## 📄 Phase 4: Auth Routes

### 4.1 app/routes/auth/login.tsx (NEW)

```typescript
import { Form, Link, useActionData, useNavigation, useSearchParams } from 'react-router';
import type { Route } from './+types/login';
import { createSupabaseServerClient, getEnvFromContext } from '~/lib/supabase.server';
import { redirectIfAuthenticated } from '~/lib/auth.server';
import { redirect, json } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { headers } = await redirectIfAuthenticated(request, env);
  return json(null, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnvFromContext(context);
  const { supabase, headers } = createSupabaseServerClient(request, env);
  const formData = await request.formData();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    return json({ error: '이메일과 비밀번호를 입력해주세요.' }, { headers });
  }
  
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    return json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { headers });
  }
  
  return redirect('/home', { headers });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const message = searchParams.get('message');
  const isLoading = navigation.state === 'submitting';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">My Golf Score</h1>
          <p className="text-muted-foreground mt-1">로그인</p>
        </div>
        
        {message && (
          <div className="mb-4 p-3 bg-primary/10 text-primary text-sm rounded-md">
            {message}
          </div>
        )}
        
        <Form method="post" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="email@example.com"
              required 
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required
              autoComplete="current-password"
            />
          </div>
          
          {actionData?.error && (
            <p className="text-destructive text-sm">{actionData.error}</p>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </Form>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/auth/signup" className="text-primary hover:underline">
            회원가입
          </Link>
          <span className="mx-2">|</span>
          <Link to="/auth/forgot-password" className="text-primary hover:underline">
            비밀번호 찾기
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 4.2 app/routes/auth/signup.tsx (NEW)

```typescript
import { Form, Link, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/signup';
import { createSupabaseServerClient, getEnvFromContext } from '~/lib/supabase.server';
import { redirectIfAuthenticated } from '~/lib/auth.server';
import { redirect, json } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { headers } = await redirectIfAuthenticated(request, env);
  return json(null, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnvFromContext(context);
  const { supabase, headers } = createSupabaseServerClient(request, env);
  const formData = await request.formData();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const name = formData.get('name') as string;
  
  if (!email || !password) {
    return json({ error: '이메일과 비밀번호를 입력해주세요.' }, { headers });
  }
  
  if (password !== confirmPassword) {
    return json({ error: '비밀번호가 일치하지 않습니다.' }, { headers });
  }
  
  if (password.length < 6) {
    return json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { headers });
  }
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: name || '사용자' }
    }
  });
  
  if (error) {
    if (error.message.includes('already registered')) {
      return json({ error: '이미 가입된 이메일입니다.' }, { headers });
    }
    return json({ error: error.message }, { headers });
  }
  
  return redirect('/auth/login?message=회원가입이 완료되었습니다. 이메일을 확인해주세요.', { headers });
}

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">My Golf Score</h1>
          <p className="text-muted-foreground mt-1">회원가입</p>
        </div>
        
        <Form method="post" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름 (선택)</Label>
            <Input 
              id="name" 
              name="name" 
              type="text" 
              placeholder="홍길동"
              autoComplete="name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="email@example.com"
              required 
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="6자 이상"
              required
              autoComplete="new-password"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              required
              autoComplete="new-password"
            />
          </div>
          
          {actionData?.error && (
            <p className="text-destructive text-sm">{actionData.error}</p>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '가입 중...' : '회원가입'}
          </Button>
        </Form>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{' '}
          <Link to="/auth/login" className="text-primary hover:underline">
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 4.3 app/routes/auth/forgot-password.tsx (NEW)

```typescript
import { Form, Link, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/forgot-password';
import { createSupabaseServerClient, getEnvFromContext } from '~/lib/supabase.server';
import { json } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnvFromContext(context);
  const { supabase, headers } = createSupabaseServerClient(request, env);
  const formData = await request.formData();
  
  const email = formData.get('email') as string;
  
  if (!email) {
    return json({ error: '이메일을 입력해주세요.' }, { headers });
  }
  
  const url = new URL(request.url);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${url.origin}/auth/reset-password`
  });
  
  if (error) {
    return json({ error: error.message }, { headers });
  }
  
  return json({ success: '비밀번호 재설정 이메일을 발송했습니다.' }, { headers });
}

export default function ForgotPasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">비밀번호 찾기</h1>
          <p className="text-muted-foreground mt-1">
            가입한 이메일로 재설정 링크를 보내드립니다
          </p>
        </div>
        
        <Form method="post" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="email@example.com"
              required 
            />
          </div>
          
          {actionData?.error && (
            <p className="text-destructive text-sm">{actionData.error}</p>
          )}
          
          {actionData?.success && (
            <p className="text-primary text-sm">{actionData.success}</p>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '발송 중...' : '재설정 이메일 발송'}
          </Button>
        </Form>
        
        <div className="mt-6 text-center">
          <Link to="/auth/login" className="text-sm text-primary hover:underline">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 4.4 app/routes/auth/reset-password.tsx (NEW)

```typescript
import { Form, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/reset-password';
import { createSupabaseServerClient, getEnvFromContext } from '~/lib/supabase.server';
import { redirect, json } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export async function loader({ request, context }: Route.LoaderArgs) {
  // This page is accessed via email link with code in URL
  const env = getEnvFromContext(context);
  const { supabase, headers } = createSupabaseServerClient(request, env);
  
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (code) {
    // Exchange code for session
    await supabase.auth.exchangeCodeForSession(code);
  }
  
  return json(null, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnvFromContext(context);
  const { supabase, headers } = createSupabaseServerClient(request, env);
  const formData = await request.formData();
  
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  
  if (!password) {
    return json({ error: '새 비밀번호를 입력해주세요.' }, { headers });
  }
  
  if (password !== confirmPassword) {
    return json({ error: '비밀번호가 일치하지 않습니다.' }, { headers });
  }
  
  if (password.length < 6) {
    return json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { headers });
  }
  
  const { error } = await supabase.auth.updateUser({ password });
  
  if (error) {
    return json({ error: error.message }, { headers });
  }
  
  return redirect('/auth/login?message=비밀번호가 변경되었습니다.', { headers });
}

export default function ResetPasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">비밀번호 재설정</h1>
          <p className="text-muted-foreground mt-1">새 비밀번호를 입력해주세요</p>
        </div>
        
        <Form method="post" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">새 비밀번호</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="6자 이상"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              required
            />
          </div>
          
          {actionData?.error && (
            <p className="text-destructive text-sm">{actionData.error}</p>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </Form>
      </div>
    </div>
  );
}
```

### 4.5 app/routes/auth/callback.tsx (NEW)

```typescript
import type { Route } from './+types/callback';
import { createSupabaseServerClient, getEnvFromContext } from '~/lib/supabase.server';
import { redirect } from 'react-router';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { supabase, headers } = createSupabaseServerClient(request, env);
  
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/home';
  
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirect(next, { headers });
    }
  }
  
  return redirect('/auth/login?message=인증에 실패했습니다.', { headers });
}
```

---

## 📄 Phase 5: Layout & Loader Migration

### 5.1 app/routes/_layout.tsx 수정

```typescript
import { Outlet, useLoaderData } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import type { Route } from './+types/_layout';
import { requireAuth } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import { getQueryClient } from '~/queries/query-client';
import { json } from 'react-router';
import { Header } from '~/components/layout/header';
import { BottomNav } from '~/components/layout/bottom-nav';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, headers } = await requireAuth(request, env);
  
  return json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.profile.name
    },
    env: {
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
    }
  }, { headers });
}

export default function Layout() {
  const { user, env } = useLoaderData<typeof loader>();
  const queryClient = getQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      {/* Pass env to window for browser client */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(env)}`
        }}
      />
      <div className="flex flex-col min-h-screen">
        <Header userName={user.name} />
        <main className="flex-1 pb-16">
          <Outlet context={{ user }} />
        </main>
        <BottomNav />
      </div>
    </QueryClientProvider>
  );
}
```

### 5.2 Loader Migration Pattern

모든 loader 파일에서 다음 패턴으로 수정:

```typescript
// BEFORE (app/loaders/home.server.ts)
import { requireAuth } from '~/lib/auth.server';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = requireAuth(request);
  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);
  
  const { data } = await supabase
    .from('rounds')
    .select('*')
    .eq('user_id', session.userId);
  
  return { rounds: data };
}

// AFTER
import { requireAuth } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import { json } from 'react-router';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { supabase, headers } = await requireAuth(request, env);
  
  // RLS automatically filters by user
  const { data } = await supabase
    .from('rounds')
    .select('*');
  
  return json({ rounds: data }, { headers });
}
```

---

## 📦 Phase 6: TanStack Query Setup

### 6.1 app/queries/query-client.ts (NEW)

```typescript
import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
```

### 6.2 app/queries/keys.ts (NEW)

```typescript
export const queryKeys = {
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    stats: () => [...queryKeys.user.all, 'stats'] as const,
  },
  rounds: {
    all: ['rounds'] as const,
    list: (filters?: { status?: string }) => 
      [...queryKeys.rounds.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.rounds.all, 'detail', id] as const,
    inProgress: () => [...queryKeys.rounds.all, 'in-progress'] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: () => [...queryKeys.courses.all, 'list'] as const,
  },
  companions: {
    all: ['companions'] as const,
    list: () => [...queryKeys.companions.all, 'list'] as const,
    withStats: () => [...queryKeys.companions.all, 'with-stats'] as const,
  },
} as const;
```

---

## 🗑️ Phase 7: Cleanup

### 삭제할 파일
- `app/components/auth/pin-pad.tsx`
- `app/lib/rate-limit.server.ts`
- `app/lib/__tests__/rate-limit.server.test.ts`
- `app/lib/__tests__/auth.server.test.ts` (PIN 관련 테스트)

### 수정할 파일 (PIN 참조 제거)
- `app/types/database.ts` - profiles 타입에서 PIN 컬럼 제거
- `app/types/index.ts` - PinPadProps 제거
- `app/lib/errors.ts` - INVALID_PIN 에러 제거
- `app/routes/login.tsx` → 삭제 또는 redirect to /auth/login

### 환경 변수 변경 (.dev.vars)
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...          # 새로 추가
SUPABASE_SERVICE_ROLE_KEY=...  # 유지
# DEFAULT_USER_ID 제거
```

---

## ✅ 체크리스트

### Phase 1: Database
- [ ] Supabase SQL Editor에서 마이그레이션 실행
- [ ] 데이터 마이그레이션 확인 (기존 데이터가 새 user로 이전되었는지)
- [ ] RLS 정책 테스트

### Phase 2: Dependencies
- [ ] @supabase/ssr 설치
- [ ] @tanstack/react-query 설치

### Phase 3: Supabase Clients
- [ ] supabase.server.ts 재작성
- [ ] supabase.client.ts 생성

### Phase 4: Auth Module
- [ ] auth.server.ts 재작성

### Phase 5: Auth Routes
- [ ] /auth/login 생성
- [ ] /auth/signup 생성
- [ ] /auth/forgot-password 생성
- [ ] /auth/reset-password 생성
- [ ] /auth/callback 생성

### Phase 6: Layout & Loaders
- [ ] _layout.tsx 수정 (QueryClientProvider 추가)
- [ ] 모든 loader 마이그레이션

### Phase 7: TanStack Query
- [ ] query-client.ts 생성
- [ ] keys.ts 생성

### Phase 8: Cleanup
- [ ] PIN 관련 파일 삭제
- [ ] 타입 정의 업데이트
- [ ] 환경 변수 업데이트

---

## 📌 참고 사항

1. **SUPABASE_ANON_KEY**: Supabase Dashboard > Settings > API에서 확인
2. **이메일 인증**: Supabase Dashboard > Auth > Providers에서 이메일 확인 활성화/비활성화 설정
3. **Redirect URLs**: Supabase Dashboard > Auth > URL Configuration에서 설정
   - Site URL: 프로덕션 URL
   - Redirect URLs: `/auth/callback`, `/auth/reset-password`
