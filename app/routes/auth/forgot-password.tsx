// Forgot Password Page
import { Form, Link, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/forgot-password';
import {
  createSupabaseServerClient,
  getEnvFromContext,
} from '~/lib/supabase.server';
import { data } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnvFromContext(context);
  const { supabase, headers } = createSupabaseServerClient(request, env);
  const formData = await request.formData();

  const email = formData.get('email') as string;

  if (!email) {
    return data(
      { error: '이메일을 입력해주세요.' },
      { headers, status: 400 }
    );
  }

  const url = new URL(request.url);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${url.origin}/auth/reset-password`,
  });

  if (error) {
    return data({ error: error.message }, { headers, status: 400 });
  }

  return data(
    { success: '비밀번호 재설정 이메일을 발송했습니다.' },
    { headers }
  );
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
              className="h-12"
            />
          </div>

          {'error' in (actionData ?? {}) && (
            <p className="text-destructive text-sm">{(actionData as { error: string }).error}</p>
          )}

          {'success' in (actionData ?? {}) && (
            <p className="text-primary text-sm">{(actionData as { success: string }).success}</p>
          )}

          <Button type="submit" className="w-full h-12" disabled={isLoading}>
            {isLoading ? '발송 중...' : '재설정 이메일 발송'}
          </Button>
        </Form>

        <div className="mt-6 text-center">
          <Link
            to="/auth/login"
            className="text-sm text-primary hover:underline"
          >
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
