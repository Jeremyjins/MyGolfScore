// Round new page loader and action with Supabase Auth
import type { Route } from '../routes/+types/round.new';
import { requireAuth } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import { data } from 'react-router';
import type { Course, Companion } from '~/types';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;

  const [coursesResult, companionsResult] = await Promise.all([
    supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false })
      .order('name'),
    supabase
      .from('companions')
      .select('*')
      .eq('user_id', userId)
      .order('name'),
  ]);

  // Transform Supabase data to match our types
  const courses: Course[] = (coursesResult.data ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    name: c.name,
    holes: c.holes as unknown as Course['holes'],
    is_favorite: c.is_favorite ?? false,
    created_at: c.created_at ?? '',
    updated_at: c.updated_at ?? '',
  }));

  const companions: Companion[] = (companionsResult.data ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    name: c.name,
    nickname: c.nickname,
    photo_url: c.photo_url,
    is_favorite: c.is_favorite ?? false,
    created_at: c.created_at ?? '',
    updated_at: c.updated_at ?? '',
  }));

  return data({ courses, companions }, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;
  const formData = await request.formData();

  const playDate = formData.get('playDate') as string;
  const teeTime = formData.get('teeTime') as string;
  const courseId = formData.get('courseId') as string;
  const companionIds = JSON.parse(
    (formData.get('companionIds') as string) || '[]'
  ) as string[];

  if (!courseId) {
    return data({ error: '코스를 선택하세요.' }, { headers });
  }

  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .insert({
      user_id: userId,
      course_id: courseId,
      play_date: playDate,
      tee_time: teeTime || null,
      status: 'in_progress',
    })
    .select()
    .single();

  if (roundError || !round) {
    return data({ error: '라운드 생성에 실패했습니다.' }, { headers });
  }

  const players = [
    { round_id: round.id, user_id: userId, player_order: 0, is_owner: true },
    ...companionIds.map((companionId, index) => ({
      round_id: round.id,
      companion_id: companionId,
      player_order: index + 1,
      is_owner: false,
    })),
  ];

  const { error: playersError } = await supabase
    .from('round_players')
    .insert(players);

  if (playersError) {
    await supabase.from('rounds').delete().eq('id', round.id);
    return data({ error: '플레이어 추가에 실패했습니다.' }, { headers });
  }

  return data({ success: true, roundId: round.id }, { headers });
}
