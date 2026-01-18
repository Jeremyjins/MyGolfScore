// History detail page loader and action
import type { Route } from '../routes/+types/_layout.history.$id';
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
    case 'delete': {
      await supabase
        .from('rounds')
        .delete()
        .eq('id', id)
        .eq('user_id', session.userId);

      return { success: true, deleted: true };
    }
  }

  return { error: 'Unknown action' };
}
