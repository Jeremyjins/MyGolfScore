// Round scoring page loader and action
import type { Route } from '../routes/+types/round.$id';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';
import { requireAuth } from '~/lib/auth.server';
import type { Course, HoleInfo, PlayerScore, RoundDetail } from '~/types';

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const session = requireAuth(request);
  const { id } = params;

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  // 라운드 정보와 사용자의 코스 목록을 병렬로 가져오기
  const [roundResult, coursesResult] = await Promise.all([
    supabase
      .from('rounds')
      .select(
        `
        *,
        course:courses(*),
        round_players(
          id,
          player_order,
          user_id,
          companion_id,
          total_score,
          score_to_par,
          companion:companions(name)
        )
      `
      )
      .eq('id', id)
      .eq('user_id', session.userId)
      .single(),
    supabase
      .from('courses')
      .select('*')
      .eq('user_id', session.userId)
      .order('is_favorite', { ascending: false })
      .order('name'),
  ]);

  const { data: round, error: roundError } = roundResult;
  const { data: courses } = coursesResult;

  if (roundError || !round) {
    // Log error for debugging
    if (roundError) {
      console.error('Round fetch error:', roundError, 'ID:', id);
    } else {
      console.error('Round not found or unauthorized:', 'ID:', id, 'User:', session.userId);
    }
    throw new Response('라운드를 찾을 수 없습니다.', { status: 404 });
  }

  const playerIds = round.round_players.map((p: any) => p.id);
  const { data: scores } = await supabase
    .from('scores')
    .select('*')
    .in('round_player_id', playerIds);

  const players: PlayerScore[] = round.round_players
    .sort((a: any, b: any) => a.player_order - b.player_order)
    .map((player: any) => {
      const playerScores: Record<number, number> = {};
      (scores ?? [])
        .filter((s: any) => s.round_player_id === player.id)
        .forEach((s: any) => {
          playerScores[s.hole_number] = s.strokes;
        });

      return {
        id: player.id,
        name: player.companion?.name || session.userName,
        isUser: player.user_id !== null,
        scores: playerScores,
        totalScore: player.total_score,
        scoreToPar: player.score_to_par,
      };
    });

  // Transform course data to match RoundDetail type
  const course = round.course
    ? {
        id: round.course.id as string,
        name: round.course.name as string,
        holes: round.course.holes as unknown as HoleInfo[],
      }
    : null;

  const roundDetail: RoundDetail = {
    id: round.id,
    playDate: round.play_date,
    teeTime: round.tee_time,
    status: round.status as 'in_progress' | 'completed',
    course,
    players,
  };

  // Transform courses data to match Course type
  const transformedCourses: Course[] = (courses ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    name: c.name,
    holes: c.holes as unknown as HoleInfo[],
    is_favorite: c.is_favorite ?? false,
    created_at: c.created_at ?? '',
    updated_at: c.updated_at ?? '',
  }));

  return { round: roundDetail, userName: session.userName, courses: transformedCourses };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const session = requireAuth(request);
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get('intent');

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  switch (intent) {
    case 'updateScore': {
      const roundPlayerId = formData.get('roundPlayerId') as string;
      const holeNumber = parseInt(formData.get('holeNumber') as string);
      const strokes = parseInt(formData.get('strokes') as string);

      const { data: existing } = await supabase
        .from('scores')
        .select('id')
        .eq('round_player_id', roundPlayerId)
        .eq('hole_number', holeNumber)
        .single();

      if (existing) {
        await supabase
          .from('scores')
          .update({ strokes })
          .eq('id', existing.id);
      } else {
        await supabase.from('scores').insert({
          round_player_id: roundPlayerId,
          hole_number: holeNumber,
          strokes,
        });
      }

      const { data: allScores } = await supabase
        .from('scores')
        .select('strokes')
        .eq('round_player_id', roundPlayerId);

      const totalScore = (allScores ?? []).reduce(
        (sum, s) => sum + s.strokes,
        0
      );

      const { data: roundData } = await supabase
        .from('rounds')
        .select('course:courses(holes)')
        .eq('id', id)
        .single();

      const holes = (roundData?.course?.holes as unknown as HoleInfo[]) ?? [];
      const playedHoles = (allScores ?? []).length;
      const playedPar = holes.slice(0, playedHoles).reduce((sum, h) => sum + h.par, 0);
      const scoreToPar = totalScore - playedPar;

      await supabase
        .from('round_players')
        .update({ total_score: totalScore, score_to_par: scoreToPar })
        .eq('id', roundPlayerId);

      return { success: true };
    }

    case 'completeRound': {
      await supabase
        .from('rounds')
        .update({ status: 'completed' })
        .eq('id', id)
        .eq('user_id', session.userId);

      return { success: true, completed: true };
    }

    case 'updateRoundInfo': {
      const playDate = formData.get('playDate') as string;
      const teeTime = formData.get('teeTime') as string;

      const updateData: { play_date?: string; tee_time?: string | null } = {};

      if (playDate) {
        updateData.play_date = playDate;
      }

      // teeTime이 빈 문자열이면 null로 설정
      updateData.tee_time = teeTime || null;

      await supabase
        .from('rounds')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', session.userId);

      return { success: true };
    }

    case 'updateCourse': {
      const courseId = formData.get('courseId') as string;

      if (!courseId) {
        return { error: '코스를 선택하세요.' };
      }

      // 코스가 사용자의 것인지 확인
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('user_id', session.userId)
        .single();

      if (!course) {
        return { error: '유효하지 않은 코스입니다.' };
      }

      await supabase
        .from('rounds')
        .update({ course_id: courseId })
        .eq('id', id)
        .eq('user_id', session.userId);

      return { success: true, courseUpdated: true };
    }
  }

  return { error: 'Unknown action' };
}
