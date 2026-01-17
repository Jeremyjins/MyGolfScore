// Round Score Recording Page
import { useState, useEffect, useCallback } from 'react';
import { Link, useFetcher, useNavigate } from 'react-router';
import type { Route } from './+types/round.$id';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
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
import { ScoreTable } from '~/components/score/score-table';
import { ScoreInputSheet } from '~/components/score/score-input-sheet';
import { ArrowLeftIcon, CheckCircleIcon } from '~/components/ui/icons';
import { formatScoreToPar } from '~/lib/score-utils';
import type { HoleInfo, PlayerScore, RoundDetail } from '~/types';

export { loader, action } from '~/loaders/round.server';

const STORAGE_KEY_PREFIX = 'round_scores_';

export default function RoundPage({ loaderData }: Route.ComponentProps) {
  const { round, userName } = loaderData as { round: RoundDetail; userName: string };
  const fetcher = useFetcher<{ success?: boolean; completed?: boolean }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'out' | 'in'>('out');
  const [players, setPlayers] = useState<PlayerScore[]>(round.players);
  const [inputSheet, setInputSheet] = useState<{
    open: boolean;
    playerId: string;
    holeNumber: number;
  }>({ open: false, playerId: '', holeNumber: 1 });

  const holes = (round.course?.holes as HoleInfo[]) ?? [];
  const storageKey = `${STORAGE_KEY_PREFIX}${round.id}`;

  // LocalStorage에서 스코어 복원
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const savedPlayers = JSON.parse(saved) as PlayerScore[];
        // 서버 데이터와 로컬 데이터 병합 (로컬이 더 최신일 수 있음)
        setPlayers((current) =>
          current.map((player) => {
            const savedPlayer = savedPlayers.find((sp) => sp.id === player.id);
            if (savedPlayer) {
              return {
                ...player,
                scores: { ...player.scores, ...savedPlayer.scores },
              };
            }
            return player;
          })
        );
      } catch (e) {
        console.error('Failed to parse saved scores:', e);
      }
    }
  }, [storageKey]);

  // 스코어 변경 시 LocalStorage에 저장
  const saveToStorage = useCallback(
    (updatedPlayers: PlayerScore[]) => {
      localStorage.setItem(storageKey, JSON.stringify(updatedPlayers));
    },
    [storageKey]
  );

  // 완료 후 리다이렉트
  useEffect(() => {
    if (fetcher.data?.completed) {
      localStorage.removeItem(storageKey);
      navigate(`/history/${round.id}`);
    }
  }, [fetcher.data, navigate, round.id, storageKey]);

  const handleCellClick = (playerId: string, holeNumber: number) => {
    setInputSheet({ open: true, playerId, holeNumber });
  };

  const handleScoreChange = (score: number) => {
    const { playerId, holeNumber } = inputSheet;

    // Optimistic UI: 로컬 상태 즉시 업데이트
    setPlayers((current) => {
      const updated = current.map((player) => {
        if (player.id === playerId) {
          return {
            ...player,
            scores: { ...player.scores, [holeNumber]: score },
          };
        }
        return player;
      });
      saveToStorage(updated);
      return updated;
    });

    // 서버에 비동기 저장
    fetcher.submit(
      {
        intent: 'updateScore',
        roundPlayerId: playerId,
        holeNumber: String(holeNumber),
        strokes: String(score),
      },
      { method: 'POST' }
    );
  };

  const handleComplete = () => {
    fetcher.submit({ intent: 'completeRound' }, { method: 'POST' });
  };

  // 현재 선택된 홀 정보
  const currentHole = holes.find((h) => h.hole === inputSheet.holeNumber);
  const currentPlayer = players.find((p) => p.id === inputSheet.playerId);

  // 전체 스코어 계산
  const calculateTotalForPlayer = (player: PlayerScore) => {
    return Object.values(player.scores).reduce(
      (sum, score) => sum + (score ?? 0),
      0
    );
  };

  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="font-semibold text-sm">
              {round.course?.name || '코스 미지정'}
            </h1>
            <p className="text-xs text-muted-foreground">Par {totalPar}</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>라운드 완료</AlertDialogTitle>
                <AlertDialogDescription>
                  라운드를 완료하시겠습니까? 완료 후에도 기록을 수정할 수
                  있습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleComplete}>
                  완료
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* 스코어 요약 */}
      <Card className="mx-4 mt-4">
        <CardContent className="py-3">
          <div className="flex justify-around">
            {players.map((player, index) => {
              const total = calculateTotalForPlayer(player);
              const scoredHoles = Object.keys(player.scores).length;
              const scoredPar = holes
                .slice(0, scoredHoles)
                .reduce((sum, h) => sum + h.par, 0);
              const diff = total - scoredPar;

              return (
                <div key={player.id} className="text-center">
                  <p className="text-xs text-muted-foreground truncate max-w-16">
                    {player.name}
                  </p>
                  <p className="text-xl font-bold">{total || '-'}</p>
                  {total > 0 && (
                    <p
                      className={
                        diff > 0
                          ? 'text-xs text-blue-600'
                          : diff < 0
                          ? 'text-xs text-red-600'
                          : 'text-xs text-green-600'
                      }
                    >
                      {formatScoreToPar(diff)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 탭: OUT / IN */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'out' | 'in')}
        className="px-4 mt-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="out">전반 (OUT)</TabsTrigger>
          <TabsTrigger value="in">후반 (IN)</TabsTrigger>
        </TabsList>

        <TabsContent value="out" className="mt-4">
          <Card>
            <CardContent className="p-2">
              <ScoreTable
                holes={holes}
                players={players}
                onCellClick={handleCellClick}
                isFirstNine={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in" className="mt-4">
          <Card>
            <CardContent className="p-2">
              <ScoreTable
                holes={holes}
                players={players}
                onCellClick={handleCellClick}
                isFirstNine={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 스코어 입력 시트 */}
      {currentHole && currentPlayer && (
        <ScoreInputSheet
          open={inputSheet.open}
          onOpenChange={(open) => setInputSheet((prev) => ({ ...prev, open }))}
          holeNumber={inputSheet.holeNumber}
          par={currentHole.par}
          currentScore={currentPlayer.scores[inputSheet.holeNumber] ?? null}
          playerName={currentPlayer.name}
          onScoreChange={handleScoreChange}
        />
      )}
    </div>
  );
}
