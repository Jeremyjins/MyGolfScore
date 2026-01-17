// Settings page loader and action
import { redirect } from 'react-router';
import type { Route } from '../routes/+types/_layout.settings';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';
import { requireAuth, deleteSessionCookie } from '~/lib/auth.server';

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = requireAuth(request);

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  const [coursesResult, companionsResult, roundsResult] = await Promise.all([
    supabase
      .from('courses')
      .select('id', { count: 'exact' })
      .eq('user_id', session.userId),
    supabase
      .from('companions')
      .select('id', { count: 'exact' })
      .eq('user_id', session.userId),
    supabase
      .from('rounds')
      .select('id', { count: 'exact' })
      .eq('user_id', session.userId),
  ]);

  return {
    userName: session.userName,
    stats: {
      courses: coursesResult.count ?? 0,
      companions: companionsResult.count ?? 0,
      rounds: roundsResult.count ?? 0,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'logout') {
    return redirect('/login', {
      headers: {
        'Set-Cookie': deleteSessionCookie(),
      },
    });
  }

  return { error: 'Unknown action' };
}
