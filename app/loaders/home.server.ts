// Home page loader
import type { Route } from '../routes/+types/_layout.home';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';
import { requireAuth } from '~/lib/auth.server';

// 라운드별 데이터 (차트용)
interface RoundData {
  date: string;
  score: number; // 파 대비 스코어
  totalStrokes: number; // 총 타수
}

// 스코어 분포
interface ScoreDistribution {
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  double: number;
  triple_plus: number;
}

interface UserStats {
  totalRounds: number;
  averageScore: number;
  bestScore: number;
  handicap: number;
  recentScores: number[];
  roundHistory: RoundData[]; // 라운드별 세부 정보
  scoreDistribution: ScoreDistribution; // 홀별 스코어 분포
}

const defaultStats: UserStats = {
  totalRounds: 0,
  averageScore: 0,
  bestScore: 0,
  handicap: 0,
  recentScores: [],
  roundHistory: [],
  scoreDistribution: {
    eagle: 0,
    birdie: 0,
    par: 0,
    bogey: 0,
    double: 0,
    triple_plus: 0,
  },
};

function parseStats(data: unknown): Omit<UserStats, 'roundHistory' | 'scoreDistribution'> & { rawScoreDistribution: Record<string, number> | null } {
  if (!data || typeof data !== 'object') {
    return {
      totalRounds: 0,
      averageScore: 0,
      bestScore: 0,
      handicap: 0,
      recentScores: [],
      rawScoreDistribution: null,
    };
  }
  const d = data as Record<string, unknown>;
  return {
    totalRounds: (d.totalRounds as number) ?? 0,
    averageScore: (d.averageScore as number) ?? 0,
    bestScore: (d.bestScore as number) ?? 0,
    handicap: (d.handicap as number) ?? 0,
    recentScores: (d.recentScores as number[]) ?? [],
    rawScoreDistribution: (d.scoreDistribution as Record<string, number>) ?? null,
  };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = requireAuth(request);

  try {
    const env = getEnvFromContext(context);
    const supabase = getSupabase(env);
    const userId = session.userId;

    // 최근 라운드 5개 + 간단 통계 + 차트용 라운드 히스토리
    const [roundsResult, statsResult, roundHistoryResult] = await Promise.all([
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
      // 차트용 라운드 히스토리 쿼리
      supabase
        .from('rounds')
        .select(`
          id,
          play_date,
          course:courses(holes),
          round_players!inner(
            id,
            is_owner,
            total_score,
            score_to_par
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .eq('round_players.is_owner', true)
        .order('play_date', { ascending: true })
        .limit(10), // Home에서는 최근 10개만
    ]);

    if (statsResult.error) {
      console.error('Stats RPC error:', statsResult.error);
    }

    // 라운드 히스토리 구성
    const roundHistory: RoundData[] = [];
    if (roundHistoryResult.data) {
      for (const round of roundHistoryResult.data) {
        const player = Array.isArray(round.round_players)
          ? round.round_players[0]
          : round.round_players;

        if (player?.total_score && player.total_score > 0) {
          const holes = (round.course as { holes?: unknown[] })?.holes as { par: number }[] | undefined;
          const totalPar = holes?.reduce((sum, h) => sum + (h.par || 0), 0) || 72;
          const scoreToPar = player.total_score - totalPar;

          roundHistory.push({
            date: round.play_date,
            score: scoreToPar,
            totalStrokes: player.total_score,
          });
        }
      }
    }

    const parsedStats = parseStats(statsResult.data);

    // 스코어 분포 처리
    const rawDistribution = parsedStats.rawScoreDistribution;
    const scoreDistribution: ScoreDistribution = {
      eagle: rawDistribution?.eagle || 0,
      birdie: rawDistribution?.birdie || 0,
      par: rawDistribution?.par || 0,
      bogey: rawDistribution?.bogey || 0,
      double: rawDistribution?.double || 0,
      triple_plus: rawDistribution?.triple_plus || 0,
    };

    return {
      userName: session.userName,
      recentRounds: roundsResult.data ?? [],
      stats: {
        totalRounds: parsedStats.totalRounds,
        averageScore: parsedStats.averageScore,
        bestScore: parsedStats.bestScore,
        handicap: parsedStats.handicap,
        recentScores: parsedStats.recentScores,
        roundHistory,
        scoreDistribution,
      },
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
