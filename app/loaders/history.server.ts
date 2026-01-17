// History list page loader
import type { Route } from '../routes/+types/_layout.history';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';
import { requireAuth } from '~/lib/auth.server';

interface RoundSummary {
  id: string;
  play_date: string;
  tee_time: string | null;
  status: string;
  course_name: string;
  total_score: number | null;
  score_to_par: number | null;
  player_count: number;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = requireAuth(request);

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  const { data: rounds } = await supabase
    .from('rounds')
    .select(
      `
      id,
      play_date,
      tee_time,
      status,
      course:courses(name),
      round_players(total_score, score_to_par, user_id)
    `
    )
    .eq('user_id', session.userId)
    .order('play_date', { ascending: false });

  const roundSummaries: RoundSummary[] = (rounds ?? []).map((round: any) => {
    const userPlayer = round.round_players.find((p: any) => p.user_id !== null);
    return {
      id: round.id,
      play_date: round.play_date,
      tee_time: round.tee_time,
      status: round.status,
      course_name: round.course?.name || '코스 미지정',
      total_score: userPlayer?.total_score || null,
      score_to_par: userPlayer?.score_to_par || null,
      player_count: round.round_players.length,
    };
  });

  return { rounds: roundSummaries };
}
