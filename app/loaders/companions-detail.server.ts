// Companion detail page loader and action
import type { Route } from '../routes/+types/_layout.companions.$id';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';
import { requireAuth } from '~/lib/auth.server';
import type { Companion } from '~/types';

interface RoundHistory {
  id: string;
  play_date: string;
  course_name: string;
  total_score: number | null;
  score_to_par: number | null;
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const session = requireAuth(request);
  const { id } = params;

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  const { data: companion, error: companionError } = await supabase
    .from('companions')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.userId)
    .single();

  if (companionError || !companion) {
    throw new Response('동반자를 찾을 수 없습니다.', { status: 404 });
  }

  const { data: rounds } = await supabase
    .from('round_players')
    .select(`
      round:rounds(
        id,
        play_date,
        course:courses(name)
      ),
      total_score,
      score_to_par
    `)
    .eq('companion_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const roundHistory: RoundHistory[] = (rounds ?? []).map((r: any) => ({
    id: r.round?.id,
    play_date: r.round?.play_date,
    course_name: r.round?.course?.name || '코스 미지정',
    total_score: r.total_score,
    score_to_par: r.score_to_par,
  })).filter((r: RoundHistory) => r.id);

  const completedRounds = roundHistory.filter((r) => r.total_score !== null);
  const stats = {
    totalRounds: roundHistory.length,
    averageScore:
      completedRounds.length > 0
        ? completedRounds.reduce((sum, r) => sum + (r.total_score || 0), 0) /
          completedRounds.length
        : 0,
    bestScore:
      completedRounds.length > 0
        ? Math.min(...completedRounds.map((r) => r.score_to_par || 999))
        : null,
  };

  return { companion: companion as Companion, roundHistory, stats };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const session = requireAuth(request);
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get('intent');

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  switch (intent) {
    case 'update': {
      const name = formData.get('name') as string;

      if (!name || name.trim() === '') {
        return { error: '이름을 입력하세요.' };
      }

      const { error } = await supabase
        .from('companions')
        .update({ name: name.trim() })
        .eq('id', id)
        .eq('user_id', session.userId);

      if (error) {
        return { error: '수정에 실패했습니다.' };
      }

      return { success: true };
    }

    case 'delete': {
      await supabase
        .from('companions')
        .delete()
        .eq('id', id)
        .eq('user_id', session.userId);

      return { success: true, redirect: '/companions' };
    }
  }

  return { error: 'Unknown action' };
}
