// Round new page loader and action
import type { Route } from '../routes/+types/round.new';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';
import { requireAuth } from '~/lib/auth.server';
import type { Course, Companion } from '~/types';

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = requireAuth(request);

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  const [coursesResult, companionsResult] = await Promise.all([
    supabase
      .from('courses')
      .select('*')
      .eq('user_id', session.userId)
      .order('is_favorite', { ascending: false })
      .order('name'),
    supabase
      .from('companions')
      .select('*')
      .eq('user_id', session.userId)
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

  return { courses, companions };
}

export async function action({ request, context }: Route.ActionArgs) {
  const session = requireAuth(request);
  const formData = await request.formData();

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  const playDate = formData.get('playDate') as string;
  const teeTime = formData.get('teeTime') as string;
  const courseId = formData.get('courseId') as string;
  const companionIds = JSON.parse(
    (formData.get('companionIds') as string) || '[]'
  ) as string[];

  if (!courseId) {
    return { error: '코스를 선택하세요.' };
  }

  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .insert({
      user_id: session.userId,
      course_id: courseId,
      play_date: playDate,
      tee_time: teeTime || null,
      status: 'in_progress',
    })
    .select()
    .single();

  if (roundError || !round) {
    return { error: '라운드 생성에 실패했습니다.' };
  }

  const players = [
    { round_id: round.id, user_id: session.userId, player_order: 0 },
    ...companionIds.map((companionId, index) => ({
      round_id: round.id,
      companion_id: companionId,
      player_order: index + 1,
    })),
  ];

  const { error: playersError } = await supabase
    .from('round_players')
    .insert(players);

  if (playersError) {
    await supabase.from('rounds').delete().eq('id', round.id);
    return { error: '플레이어 추가에 실패했습니다.' };
  }

  return { success: true, roundId: round.id };
}
