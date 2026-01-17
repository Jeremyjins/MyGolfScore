// Round History Detail Page
import { Link, useFetcher, useNavigate } from 'react-router';
import type { Route } from './+types/_layout.history.$id';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
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
import type { HoleInfo, PlayerScore, RoundDetail } from '~/types';
import { useEffect } from 'react';

export { loader, action } from '~/loaders/history-detail.server';

export default function HistoryDetailPage({
  loaderData,
}: Route.ComponentProps) {
  const { round, userName } = loaderData as { round: RoundDetail; userName: string };
  const fetcher = useFetcher<{ deleted?: boolean }>();
  const navigate = useNavigate();

  const holes = (round.course?.holes as HoleInfo[]) ?? [];
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

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

  const renderScoreTable = (isFirstNine: boolean) => {
    const displayHoles = isFirstNine
      ? holes.filter((h) => h.hole <= 9)
      : holes.filter((h) => h.hole > 9);

    const ninePar = displayHoles.reduce((sum, h) => sum + h.par, 0);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 px-1 text-left font-medium text-muted-foreground w-20">
                홀
              </th>
              {displayHoles.map((hole) => (
                <th
                  key={hole.hole}
                  className="py-2 px-1 text-center font-medium w-9"
                >
                  {hole.hole}
                </th>
              ))}
              <th className="py-2 px-1 text-center font-medium w-12 bg-muted/50">
                합계
              </th>
            </tr>
            <tr className="border-b bg-muted/30">
              <td className="py-1 px-1 text-xs text-muted-foreground">Par</td>
              {displayHoles.map((hole) => (
                <td
                  key={hole.hole}
                  className="py-1 px-1 text-center text-xs text-muted-foreground"
                >
                  {hole.par}
                </td>
              ))}
              <td className="py-1 px-1 text-center text-xs text-muted-foreground bg-muted/50">
                {ninePar}
              </td>
            </tr>
          </thead>
          <tbody>
            {round.players.map((player, index) => {
              const nineTotal = displayHoles.reduce((sum, hole) => {
                const score = player.scores[hole.hole];
                return sum + (score ?? 0);
              }, 0);

              return (
                <tr key={player.id} className="border-b">
                  <td className="py-2 px-1">
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-xs text-white',
                          index === 0
                            ? 'bg-primary'
                            : index === 1
                            ? 'bg-orange-500'
                            : index === 2
                            ? 'bg-purple-500'
                            : 'bg-teal-500'
                        )}
                      >
                        {player.name.charAt(0)}
                      </span>
                      <span className="text-xs truncate max-w-14">
                        {player.name}
                      </span>
                    </div>
                  </td>
                  {displayHoles.map((hole) => {
                    const score = player.scores[hole.hole];
                    return (
                      <td
                        key={hole.hole}
                        className={cn(
                          'py-2 px-1 text-center',
                          getScoreStyle(score ?? null, hole.par)
                        )}
                      >
                        {score ?? '-'}
                      </td>
                    );
                  })}
                  <td className="py-2 px-1 text-center font-medium bg-muted/50">
                    {nineTotal || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
            {round.status === 'in_progress' && (
              <Link to={`/round/${round.id}`}>
                <Button variant="ghost" size="icon">
                  <EditIcon className="w-5 h-5" />
                </Button>
              </Link>
            )}
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

      {/* 상세 스코어카드 */}
      <Tabs defaultValue="out">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="out">전반 (OUT)</TabsTrigger>
          <TabsTrigger value="in">후반 (IN)</TabsTrigger>
        </TabsList>

        <TabsContent value="out" className="mt-4">
          <Card>
            <CardContent className="p-2">{renderScoreTable(true)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in" className="mt-4">
          <Card>
            <CardContent className="p-2">{renderScoreTable(false)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
