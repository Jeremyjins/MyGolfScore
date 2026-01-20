// Reset Password Page
import { Form, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/reset-password';
import {
  createSupabaseServerClient,
  getEnvFromContext,
} from '~/lib/supabase.server';
import { redirect, data } from 'react-router';
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirect('/auth/login?message=링크가 만료되었습니다.', {
        headers,
      });
    }
  }

  return data(null, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnvFromContext(context);
  const { supabase, headers } = createSupabaseServerClient(request, env);
  const formData = await request.formData();

  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password) {
    return data(
      { error: '새 비밀번호를 입력해주세요.' },
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

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return data({ error: error.message }, { headers, status: 400 });
  }

  return redirect('/auth/login?message=비밀번호가 변경되었습니다.', {
    headers,
  });
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
              className="h-12"
            />
          </div>

          {actionData?.error && (
            <p className="text-destructive text-sm">{actionData.error}</p>
          )}

          <Button type="submit" className="w-full h-12" disabled={isLoading}>
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </Form>
      </div>
    </div>
  );
}
