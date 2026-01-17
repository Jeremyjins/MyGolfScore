// Main layout loader
import type { Route } from '../routes/+types/_layout';
import { requireAuth } from '~/lib/auth.server';

export async function loader({ request }: Route.LoaderArgs) {
  const session = requireAuth(request);
  return { user: { id: session.userId, name: session.userName } };
}
