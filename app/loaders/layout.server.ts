// Main layout loader with Supabase Auth
import type { Route } from '../routes/+types/_layout';
import { requireAuth } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import { data } from 'react-router';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, headers } = await requireAuth(request, env);

  return data(
    {
      user: {
        id: session.user.id,
        name: session.profile.name,
        email: session.user.email,
      },
    },
    { headers }
  );
}
