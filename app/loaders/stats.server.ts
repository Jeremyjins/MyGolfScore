// Stats page loader
import type { Route } from '../routes/+types/_layout.stats';
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
  recentScores: number[]; // 파 대비 스코어 배열
  roundHistory: RoundData[]; // 라운드별 세부 정보
  scoreDistribution: ScoreDistribution;
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

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = requireAuth(request);

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  // 기존 RPC 호출
  const { data } = await supabase.rpc('get_user_stats', {
    p_user_id: session.userId,
  });

  // 라운드별 세부 정보 쿼리
  const { data: roundsData } = await supabase
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
    .eq('user_id', session.userId)
    .eq('status', 'completed')
    .eq('round_players.is_owner', true)
    .order('play_date', { ascending: true })
    .limit(50); // 핸디캡/평균 추이 계산을 위해 충분한 데이터 제공

  // 라운드 히스토리 구성
  const roundHistory: RoundData[] = [];
  if (roundsData) {
    for (const round of roundsData) {
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

  // RPC 결과 타입 처리
  const rpcData = data as Record<string, unknown> | null;

  // 스코어 분포 처리
  const rawDistribution = rpcData?.scoreDistribution as Record<string, number> | null;
  const scoreDistribution: ScoreDistribution = {
    eagle: rawDistribution?.eagle || 0,
    birdie: rawDistribution?.birdie || 0,
    par: rawDistribution?.par || 0,
    bogey: rawDistribution?.bogey || 0,
    double: rawDistribution?.double || 0,
    triple_plus: rawDistribution?.triple_plus || 0,
  };

  const stats: UserStats = rpcData
    ? {
        totalRounds: (rpcData.totalRounds as number) ?? 0,
        averageScore: (rpcData.averageScore as number) ?? 0,
        bestScore: (rpcData.bestScore as number) ?? 0,
        handicap: (rpcData.handicap as number) ?? 0,
        recentScores: (rpcData.recentScores as number[]) ?? [],
        roundHistory,
        scoreDistribution,
      }
    : defaultStats;

  return { stats };
}
