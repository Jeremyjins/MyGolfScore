// Login Page with Email/Password
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useSearchParams,
} from 'react-router';
import type { Route } from './+types/login';
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

  if (!email || !password) {
    return data(
      { error: '이메일과 비밀번호를 입력해주세요.' },
      { headers, status: 400 }
    );
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return data(
      { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
      { headers, status: 401 }
    );
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
              className="h-12"
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
              className="h-12"
            />
          </div>

          {actionData?.error && (
            <p className="text-destructive text-sm">{actionData.error}</p>
          )}

          <Button type="submit" className="w-full h-12" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </Form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/auth/signup" className="text-primary hover:underline">
            회원가입
          </Link>
          <span className="mx-2">|</span>
          <Link
            to="/auth/forgot-password"
            className="text-primary hover:underline"
          >
            비밀번호 찾기
          </Link>
        </div>
      </div>
    </div>
  );
}
