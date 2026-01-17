// Stats page loader
import type { Route } from '../routes/+types/_layout.stats';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';
import { requireAuth } from '~/lib/auth.server';

interface UserStats {
  totalRounds: number;
  averageScore: number;
  bestScore: number;
  handicap: number;
  recentScores: number[];
}

const defaultStats: UserStats = {
  totalRounds: 0,
  averageScore: 0,
  bestScore: 0,
  handicap: 0,
  recentScores: [],
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = requireAuth(request);

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  const { data } = await supabase.rpc('get_user_stats', {
    p_user_id: session.userId,
  });

  // Type the RPC response properly
  const stats: UserStats = data
    ? {
        totalRounds: (data as Record<string, unknown>).totalRounds as number ?? 0,
        averageScore: (data as Record<string, unknown>).averageScore as number ?? 0,
        bestScore: (data as Record<string, unknown>).bestScore as number ?? 0,
        handicap: (data as Record<string, unknown>).handicap as number ?? 0,
        recentScores: ((data as Record<string, unknown>).recentScores as number[]) ?? [],
      }
    : defaultStats;

  return { stats };
}
