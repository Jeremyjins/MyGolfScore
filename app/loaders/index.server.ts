// Index page loader
import type { Route } from '../routes/+types/_index';
import { getSession } from '~/lib/auth.server';
import { redirect } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const session = getSession(request);

  if (session) {
    throw redirect('/home');
  }

  throw redirect('/login');
}
