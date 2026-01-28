// Settings page loader and action with Supabase Auth
import { redirect, data } from 'react-router';
import type { Route } from '../routes/+types/_layout.settings';
import { requireAuth, signOut } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import type { Club } from '~/types';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;

  const [coursesResult, companionsResult, roundsResult, allClubsResult, userClubsResult] = await Promise.all([
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
    supabase
      .from('clubs')
      .select('*')
      .order('sort_order'),
    supabase
      .from('user_clubs')
      .select('club_id')
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);

  const allClubs = (allClubsResult.data ?? []) as Club[];
  const userClubIds = (userClubsResult.data ?? []).map((uc) => uc.club_id);

  return data(
    {
      userName: session.profile.name,
      userEmail: session.user.email,
      stats: {
        courses: coursesResult.count ?? 0,
        companions: companionsResult.count ?? 0,
        rounds: roundsResult.count ?? 0,
      },
      allClubs,
      userClubIds,
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

  if (intent === 'toggleClub') {
    const { session, supabase, headers } = await requireAuth(request, env);
    const userId = session.user.id;
    const clubId = formData.get('clubId')?.toString();
    const action = formData.get('action')?.toString();

    // UUID 형식 검증
    const isValidUUID = (uuid: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

    if (!clubId || !isValidUUID(clubId)) {
      return data({ error: 'Invalid clubId format' }, { status: 400, headers });
    }

    // action 화이트리스트 검증
    if (!action || !['add', 'remove'].includes(action)) {
      return data({ error: 'Invalid action' }, { status: 400, headers });
    }

    if (action === 'add') {
      // 클럽 추가 (upsert)
      await supabase.from('user_clubs').upsert(
        {
          user_id: userId,
          club_id: clubId,
          is_active: true,
        },
        {
          onConflict: 'user_id,club_id',
        }
      );
    } else if (action === 'remove') {
      // 클럽 제거 (soft delete)
      await supabase
        .from('user_clubs')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('club_id', clubId);
    }

    return data({ success: true }, { headers });
  }

  return data({ error: 'Unknown action' });
}
