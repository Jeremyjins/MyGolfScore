// Auth Callback Handler for email confirmation and OAuth
import type { Route } from './+types/callback';
import {
  createSupabaseServerClient,
  getEnvFromContext,
} from '~/lib/supabase.server';
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

export default function AuthCallback() {
  // This component should not render as the loader always redirects
  return null;
}
