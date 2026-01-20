// Companion detail page loader and action with Supabase Auth
import type { Route } from '../routes/+types/_layout.companions.$id';
import { requireAuth } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import { data } from 'react-router';
import type { Companion } from '~/types';

interface RoundHistory {
  id: string;
  play_date: string;
  course_name: string;
  total_score: number | null;
  score_to_par: number | null;
}

// 차트용 라운드 데이터
interface RoundData {
  date: string;
  score: number; // 파 대비 스코어
  totalStrokes: number;
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

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;
  const { id } = params;

  const { data: companion, error: companionError } = await supabase
    .from('companions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (companionError || !companion) {
    throw new Response('동반자를 찾을 수 없습니다.', { status: 404 });
  }

  // 라운드 히스토리 가져오기 (차트용으로 더 많이, 오래된 것부터)
  const { data: rounds } = await supabase
    .from('round_players')
    .select(`
      round:rounds(
        id,
        play_date,
        course:courses(name, holes)
      ),
      total_score,
      score_to_par
    `)
    .eq('companion_id', id)
    .order('created_at', { ascending: true })
    .limit(50);

  // 라운드 히스토리 (목록용, 최신순)
  const roundHistory: RoundHistory[] = (rounds ?? [])
    .map((r: any) => ({
      id: r.round?.id,
      play_date: r.round?.play_date,
      course_name: r.round?.course?.name || '코스 미지정',
      total_score: r.total_score,
      score_to_par: r.score_to_par,
    }))
    .filter((r: RoundHistory) => r.id)
    .reverse(); // 최신순으로 정렬

  // 차트용 라운드 데이터 (오래된 것부터)
  const chartRoundHistory: RoundData[] = (rounds ?? [])
    .filter((r: any) => r.round?.id && r.total_score && r.total_score > 0)
    .map((r: any) => {
      const holes = r.round?.course?.holes as { par: number }[] | undefined;
      const totalPar = holes?.reduce((sum, h) => sum + (h.par || 0), 0) || 72;
      const scoreToPar = r.total_score - totalPar;
      return {
        date: r.round.play_date,
        score: scoreToPar,
        totalStrokes: r.total_score,
      };
    });

  // 동반자의 round_player IDs 가져오기
  const companionPlayerIds = (rounds ?? [])
    .map((r: any) => r.round?.id)
    .filter(Boolean);

  // 해당 동반자의 scores 가져오기 (분포 계산용)
  let scoreDistribution: ScoreDistribution = {
    eagle: 0,
    birdie: 0,
    par: 0,
    bogey: 0,
    double: 0,
    triple_plus: 0,
  };

  if (companionPlayerIds.length > 0) {
    // round_players에서 companion_id가 일치하는 플레이어들의 ID 가져오기
    const { data: companionPlayers } = await supabase
      .from('round_players')
      .select(`
        id,
        round:rounds(
          course:courses(holes)
        )
      `)
      .eq('companion_id', id);

    if (companionPlayers && companionPlayers.length > 0) {
      const playerIds = companionPlayers.map((p) => p.id);

      // scores 테이블에서 해당 플레이어들의 스코어 가져오기
      const { data: scoresData } = await supabase
        .from('scores')
        .select('hole_number, strokes, round_player_id')
        .in('round_player_id', playerIds);

      if (scoresData) {
        // round_player_id별 코스 정보 매핑
        const playerCourseMap = new Map<string, { par: number }[]>();
        for (const cp of companionPlayers) {
          const holes = (cp.round as any)?.course?.holes as { par: number }[] | undefined;
          if (holes) {
            playerCourseMap.set(cp.id, holes);
          }
        }

        for (const score of scoresData) {
          const holes = playerCourseMap.get(score.round_player_id);
          if (!holes || !score.strokes) continue;

          const holePar = holes[score.hole_number - 1]?.par || 4;
          const diff = score.strokes - holePar;

          if (diff <= -2) scoreDistribution.eagle++;
          else if (diff === -1) scoreDistribution.birdie++;
          else if (diff === 0) scoreDistribution.par++;
          else if (diff === 1) scoreDistribution.bogey++;
          else if (diff === 2) scoreDistribution.double++;
          else scoreDistribution.triple_plus++;
        }
      }
    }
  }

  // 통계 계산
  const completedRounds = chartRoundHistory.filter((r) => r.totalStrokes > 0);

  // 핸디캡 계산 (최근 20개 중 상위 40% 평균 × 0.96)
  let handicap = 0;
  if (completedRounds.length >= 3) {
    const recentRounds = completedRounds.slice(-20);
    const numToUse = Math.max(1, Math.ceil(recentRounds.length * 0.4));
    const sortedScores = [...recentRounds]
      .map((r) => r.score)
      .sort((a, b) => a - b)
      .slice(0, numToUse);
    const average = sortedScores.reduce((a, b) => a + b, 0) / sortedScores.length;
    handicap = Math.round(average * 0.96 * 10) / 10;
  }

  // 평균 스코어 (파 대비)
  const averageScoreToPar = completedRounds.length > 0
    ? Math.round(completedRounds.reduce((sum, r) => sum + r.score, 0) / completedRounds.length)
    : 0;

  const stats = {
    totalRounds: roundHistory.length,
    averageScore: averageScoreToPar,
    bestScore:
      completedRounds.length > 0
        ? Math.min(...completedRounds.map((r) => r.score))
        : null,
    handicap,
    roundHistory: chartRoundHistory,
    scoreDistribution,
  };

  return data({ companion: companion as Companion, roundHistory, stats }, { headers });
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'update': {
      const name = formData.get('name') as string;

      if (!name || name.trim() === '') {
        return data({ error: '이름을 입력하세요.' }, { headers });
      }

      const { error } = await supabase
        .from('companions')
        .update({ name: name.trim() })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return data({ error: '수정에 실패했습니다.' }, { headers });
      }

      return data({ success: true }, { headers });
    }

    case 'delete': {
      await supabase
        .from('companions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return data({ success: true, redirect: '/companions' }, { headers });
    }
  }

  return data({ error: 'Unknown action' }, { headers });
}
