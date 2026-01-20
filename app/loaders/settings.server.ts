// Settings page loader and action with Supabase Auth
import { redirect, data } from 'react-router';
import type { Route } from '../routes/+types/_layout.settings';
import { requireAuth, signOut } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;

  const [coursesResult, companionsResult, roundsResult] = await Promise.all([
    supabase
      .from('courses')
      .select('id', { count: 'exact' })
      .eq('user_id', userId),
    supabase
      .from('companions')
      .select('id', { count: 'exact' })
      .eq('user_id', userId),
    supabase
      .from('rounds')
      .select('id', { count: 'exact' })
      .eq('user_id', userId),
  ]);

  return data(
    {
      userName: session.profile.name,
      userEmail: session.user.email,
      stats: {
        courses: coursesResult.count ?? 0,
        companions: companionsResult.count ?? 0,
        rounds: roundsResult.count ?? 0,
      },
    },
    { headers }
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
  const env = getEnvFromContext(context);

  if (intent === 'logout') {
    const { headers } = await signOut(request, env);
    return redirect('/auth/login', { headers });
  }

  return data({ error: 'Unknown action' });
}
