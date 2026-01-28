// Round History Detail Page
import { Link, useFetcher, useNavigate } from 'react-router';
import type { Route } from './+types/_layout.history.$id';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { ArrowLeftIcon, DeleteIcon, EditIcon } from '~/components/ui/icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatScoreToPar } from '~/lib/score-utils';
import { cn } from '~/lib/utils';
import type { HoleClubData, HoleInfo, RoundClubStats, RoundDetail } from '~/types';
import { RoundClubStatsCard } from '~/components/stats/round-club-stats-card';
import { ClubDisplay } from '~/components/club/club-display';
import { useEffect, useState } from 'react';
import type { ScoreDisplayMode } from '~/components/score/vertical-score-table';

const SCORE_MODE_KEY = 'score_display_mode';

export { loader, action } from '~/loaders/history-detail.server';

export default function HistoryDetailPage({
  loaderData,
}: Route.ComponentProps) {
  const { round, clubStats, holeClubs } = loaderData as {
    round: RoundDetail;
    userName: string;
    clubStats: RoundClubStats;
    holeClubs: HoleClubData[];
  };
  const fetcher = useFetcher<{ deleted?: boolean }>();
  const navigate = useNavigate();

  const holes = (round.course?.holes as HoleInfo[]) ?? [];
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

  // 스코어 표시 모드
  const [scoreDisplayMode, setScoreDisplayMode] = useState<ScoreDisplayMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(SCORE_MODE_KEY) as ScoreDisplayMode) || 'par';
    }
    return 'par';
  });

  // 스코어 표시 모드 저장
  useEffect(() => {
    localStorage.setItem(SCORE_MODE_KEY, scoreDisplayMode);
  }, [scoreDisplayMode]);

  // 삭제 후 리다이렉트
  useEffect(() => {
    if (fetcher.data?.deleted) {
      navigate('/history');
    }
  }, [fetcher.data, navigate]);

  const handleDelete = () => {
    fetcher.submit({ intent: 'delete' }, { method: 'POST' });
  };

  const getScoreStyle = (score: number | null, par: number) => {
    if (score === null) return '';
    const diff = score - par;
    if (diff <= -2) return 'bg-yellow-100 text-yellow-800'; // Eagle+
    if (diff === -1) return 'bg-red-100 text-red-700'; // Birdie
    if (diff === 0) return 'bg-green-100 text-green-700'; // Par
    if (diff === 1) return 'bg-blue-100 text-blue-700'; // Bogey
    if (diff === 2) return 'bg-blue-200 text-blue-800'; // Double
    return 'bg-blue-300 text-blue-900'; // Triple+
  };

  const formatScore = (score: number | null, par: number): string => {
    if (score === null) return '-';
    if (scoreDisplayMode === 'stroke') {
      return String(score);
    }
    const diff = score - par;
    if (diff === 0) return '0';
    if (diff > 0) return `+${diff}`;
    return String(diff);
  };

  const formatTotalScore = (total: number, par: number, hasScores: boolean): string => {
    if (!hasScores) return '-';
    if (scoreDisplayMode === 'stroke') {
      return String(total);
    }
    const diff = total - par;
    if (diff === 0) return '0';
    if (diff > 0) return `+${diff}`;
    return String(diff);
  };

  const frontNine = holes.filter((h) => h.hole <= 9);
  const backNine = holes.filter((h) => h.hole > 9);
  const frontPar = frontNine.reduce((sum, h) => sum + h.par, 0);
  const backPar = backNine.reduce((sum, h) => sum + h.par, 0);

  const getPlayerColor = (index: number) => {
    const colors = ['bg-primary', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500'];
    return colors[index] || 'bg-gray-500';
  };

  const renderScoreTable = (
    displayHoles: HoleInfo[],
    label: string,
    isBackNine: boolean
  ) => {
    const ninePar = displayHoles.reduce((sum, h) => sum + h.par, 0);

    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="py-2 px-1 text-left font-medium text-muted-foreground w-16">
              홀
            </th>
            {displayHoles.map((hole) => (
              <th key={hole.hole} className="py-2 px-1 text-center font-medium min-w-7">
                {hole.hole}
              </th>
            ))}
            <th className="py-2 px-1 text-center font-bold bg-muted/50 min-w-9">{label}</th>
          </tr>
          <tr className="border-b">
            <td className="py-1 px-1 text-muted-foreground">Par</td>
            {displayHoles.map((hole) => (
              <td key={hole.hole} className="py-1 px-1 text-center text-muted-foreground">
                {hole.par}
              </td>
            ))}
            <td className="py-1 px-1 text-center text-muted-foreground bg-muted/50">{ninePar}</td>
          </tr>
        </thead>
        <tbody>
          {round.players.map((player, index) => {
            const nineTotal = displayHoles.reduce((sum, hole) => sum + (player.scores[hole.hole] ?? 0), 0);
            const hasScores = displayHoles.some((h) => player.scores[h.hole] !== undefined);

            return (
              <tr key={player.id} className="border-b">
                <td className="py-2 px-1">
                  <div className="flex items-center gap-1">
                    <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white', getPlayerColor(index))}>
                      {player.name.charAt(0)}
                    </span>
                    <span className="truncate max-w-12">{player.name}</span>
                  </div>
                </td>
                {displayHoles.map((hole) => {
                  const score = player.scores[hole.hole] ?? null;
                  return (
                    <td key={hole.hole} className={cn('py-2 px-1 text-center', getScoreStyle(score, hole.par))}>
                      {formatScore(score, hole.par)}
                    </td>
                  );
                })}
                <td className={cn('py-2 px-1 text-center font-medium bg-muted/50',
                  hasScores && nineTotal - ninePar > 0 && 'text-blue-600',
                  hasScores && nineTotal - ninePar < 0 && 'text-red-600',
                  hasScores && nineTotal - ninePar === 0 && 'text-green-600'
                )}>
                  {formatTotalScore(nineTotal, ninePar, hasScores)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <PageContainer>
      <Header
        title={round.course?.name || '코스 미지정'}
        subtitle={format(new Date(round.playDate), 'yyyy년 M월 d일 (E)', {
          locale: ko,
        })}
        leftAction={
          <Link to="/history">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
        }
        rightAction={
          <div className="flex gap-1">
            <Link to={`/round/${round.id}`}>
              <Button variant="ghost" size="icon">
                <EditIcon className="w-5 h-5" />
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <DeleteIcon className="w-5 h-5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>라운드 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 라운드를 삭제하시겠습니까? 모든 스코어 기록이 함께
                    삭제됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {/* 라운드 정보 */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {round.teeTime && `${round.teeTime.slice(0, 5)} 티오프`}
              </p>
              <p className="text-sm text-muted-foreground">
                Par {totalPar} · {round.players.length}명
              </p>
            </div>
            <Badge variant={round.status === 'completed' ? 'default' : 'secondary'}>
              {round.status === 'completed' ? '완료' : '진행중'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 스코어 요약 */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">스코어 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {round.players.map((player, index) => (
              <div
                key={player.id}
                className={cn(
                  'p-3 rounded-lg',
                  index === 0 ? 'bg-primary/10' : 'bg-muted'
                )}
              >
                <p className="text-sm font-medium">{player.name}</p>
                <p className="text-2xl font-bold">
                  {player.totalScore ?? '-'}
                </p>
                {player.scoreToPar !== null && (
                  <p
                    className={
                      player.scoreToPar > 0
                        ? 'text-sm text-blue-600'
                        : player.scoreToPar < 0
                        ? 'text-sm text-red-600'
                        : 'text-sm text-green-600'
                    }
                  >
                    {formatScoreToPar(player.scoreToPar)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 스코어 표시 모드 토글 */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">스코어 표시:</span>
        <div className="inline-flex rounded-lg border p-0.5 bg-muted/50">
          <button
            onClick={() => setScoreDisplayMode('par')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              scoreDisplayMode === 'par'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            파 대비
          </button>
          <button
            onClick={() => setScoreDisplayMode('stroke')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              scoreDisplayMode === 'stroke'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            타수
          </button>
        </div>
      </div>

      {/* OUT 코스 (전반) */}
      <Card className="mb-3">
        <CardContent className="p-2">
          {renderScoreTable(frontNine, 'OUT', false)}
        </CardContent>
      </Card>

      {/* IN 코스 (후반) */}
      <Card className="mb-4">
        <CardContent className="p-2">
          {renderScoreTable(backNine, 'IN', true)}
        </CardContent>
      </Card>

      {/* 라운드 클럽 통계 */}
      {clubStats.clubUsage && clubStats.clubUsage.length > 0 && (
        <RoundClubStatsCard stats={clubStats} />
      )}

      {/* 홀별 클럽 기록 */}
      {holeClubs.some((h) => h.clubs && h.clubs.length > 0) && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">홀별 클럽 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <ClubDisplay holeClubs={holeClubs} holes={holes} />
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
