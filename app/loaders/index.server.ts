// Index page loader - redirects based on auth state
import type { Route } from '../routes/+types/_index';
import { getAuthSession } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import { redirect } from 'react-router';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, headers } = await getAuthSession(request, env);

  if (session) {
    throw redirect('/home', { headers });
  }

  throw redirect('/auth/login', { headers });
}
