// Round scoring page loader and action
import type { Route } from '../routes/+types/round.$id';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';
import { requireAuth } from '~/lib/auth.server';
import type { HoleInfo, PlayerScore, RoundDetail } from '~/types';

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const session = requireAuth(request);
  const { id } = params;

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  const { data: round, error: roundError } = await supabase
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
    .single();

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

  return { round: roundDetail, userName: session.userName };
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
  }

  return { error: 'Unknown action' };
}
