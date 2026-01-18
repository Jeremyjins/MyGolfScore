// Home page loader
import type { Route } from '../routes/+types/_layout.home';
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

function parseStats(data: unknown): UserStats {
  if (!data || typeof data !== 'object') return defaultStats;
  const d = data as Record<string, unknown>;
  return {
    totalRounds: (d.totalRounds as number) ?? 0,
    averageScore: (d.averageScore as number) ?? 0,
    bestScore: (d.bestScore as number) ?? 0,
    handicap: (d.handicap as number) ?? 0,
    recentScores: (d.recentScores as number[]) ?? [],
  };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = requireAuth(request);

  try {
    const env = getEnvFromContext(context);
    const supabase = getSupabase(env);
    const userId = session.userId;

    // 최근 라운드 5개 + 간단 통계
    const [roundsResult, statsResult] = await Promise.all([
      supabase
        .from('rounds')
        .select(`
          id,
          play_date,
          tee_time,
          status,
          course:courses(id, name, holes)
        `)
        .eq('user_id', userId)
        .order('play_date', { ascending: false })
        .limit(5),
      supabase.rpc('get_user_stats', { p_user_id: userId }),
    ]);

    if (statsResult.error) {
      console.error('Stats RPC error:', statsResult.error);
    }

    return {
      userName: session.userName,
      recentRounds: roundsResult.data ?? [],
      stats: parseStats(statsResult.data),
    };
  } catch (error) {
    console.error('Home loader error:', error);
    return {
      userName: session.userName,
      recentRounds: [],
      stats: defaultStats,
    };
  }
}
