// Signup Page with Email/Password
import { Form, Link, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/signup';
import {
  createSupabaseServerClient,
  getEnvFromContext,
} from '~/lib/supabase.server';
import { redirectIfAuthenticated } from '~/lib/auth.server';
import { redirect, data } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { headers } = await redirectIfAuthenticated(request, env);
  return data(null, { headers });
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
    return data(
      { error: '이메일과 비밀번호를 입력해주세요.' },
      { headers, status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return data(
      { error: '비밀번호가 일치하지 않습니다.' },
      { headers, status: 400 }
    );
  }

  if (password.length < 6) {
    return data(
      { error: '비밀번호는 6자 이상이어야 합니다.' },
      { headers, status: 400 }
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: name || '사용자' },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return data(
        { error: '이미 가입된 이메일입니다.' },
        { headers, status: 400 }
      );
    }
    return data({ error: error.message }, { headers, status: 400 });
  }

  return redirect(
    '/auth/login?message=회원가입이 완료되었습니다. 이메일을 확인해주세요.',
    { headers }
  );
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
              className="h-12"
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
              className="h-12"
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
              className="h-12"
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
              className="h-12"
            />
          </div>

          {actionData?.error && (
            <p className="text-destructive text-sm">{actionData.error}</p>
          )}

          <Button type="submit" className="w-full h-12" disabled={isLoading}>
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
