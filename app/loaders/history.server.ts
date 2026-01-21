// History list page loader with Supabase Auth
import type { Route } from '../routes/+types/_layout.history';
import { requireAuth } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import { data } from 'react-router';

interface RoundSummary {
  id: string;
  play_date: string;
  tee_time: string | null;
  status: string;
  course_name: string;
  total_score: number | null;
  score_to_par: number | null;
  player_count: number;
  companions: string[];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;

  const { data: rounds } = await supabase
    .from('rounds')
    .select(
      `
      id,
      play_date,
      tee_time,
      status,
      course:courses(name),
      round_players(total_score, score_to_par, user_id, is_owner, companion:companions(name))
    `
    )
    .eq('user_id', userId)
    .order('play_date', { ascending: false });

  const roundSummaries: RoundSummary[] = (rounds ?? []).map((round: any) => {
    const ownerPlayer = round.round_players.find((p: any) => p.is_owner === true);
    const companions = round.round_players
      .filter((p: any) => !p.is_owner && p.companion?.name)
      .map((p: any) => p.companion.name);
    return {
      id: round.id,
      play_date: round.play_date,
      tee_time: round.tee_time,
      status: round.status,
      course_name: round.course?.name || '코스 미지정',
      total_score: ownerPlayer?.total_score || null,
      score_to_par: ownerPlayer?.score_to_par || null,
      player_count: round.round_players.length,
      companions,
    };
  });

  return data({ rounds: roundSummaries }, { headers });
}
