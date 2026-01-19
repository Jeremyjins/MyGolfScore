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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '~/components/ui/sheet';
import {
  VerticalScoreTable,
  type ScoreDisplayMode,
} from '~/components/score/vertical-score-table';
import { ScoreInputSheet } from '~/components/score/score-input-sheet';
import { DatePicker } from '~/components/ui/date-picker';
import { TimePicker } from '~/components/ui/time-picker';
import { ArrowLeftIcon, CheckCircleIcon, CheckIcon, CalendarIcon, ClockIcon, MapPinIcon } from '~/components/ui/icons';
import { CourseCard } from '~/components/course/course-card';
import { formatScoreToPar } from '~/lib/score-utils';
import { cn } from '~/lib/utils';
import { format, parse } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { HoleInfo, PlayerScore, RoundDetail, Course } from '~/types';

export { loader, action } from '~/loaders/round.server';

const STORAGE_KEY_PREFIX = 'round_scores_';
const SCORE_MODE_KEY = 'score_display_mode';

export default function RoundPage({ loaderData }: Route.ComponentProps) {
  const { round, courses } = loaderData as { round: RoundDetail; userName: string; courses: Course[] };
  const fetcher = useFetcher<{ success?: boolean; completed?: boolean; courseUpdated?: boolean }>();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<PlayerScore[]>(round.players);
  const [inputSheet, setInputSheet] = useState<{
    open: boolean;
    playerId: string;
    holeNumber: number;
  }>({ open: false, playerId: '', holeNumber: 1 });

  // 날짜/시간 편집 상태
  const [dateTimeSheet, setDateTimeSheet] = useState(false);
  const [editPlayDate, setEditPlayDate] = useState<Date>(
    round.playDate ? parse(round.playDate, 'yyyy-MM-dd', new Date()) : new Date()
  );
  const [editTeeTime, setEditTeeTime] = useState<string>(round.teeTime || '');

  // 코스 편집 상태
  const [courseSheet, setCourseSheet] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    round.course?.id || null
  );

  // 스코어 표시 모드: stroke (타수) / par (파 대비)
  const [scoreDisplayMode, setScoreDisplayMode] = useState<ScoreDisplayMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(SCORE_MODE_KEY) as ScoreDisplayMode) || 'par';
    }
    return 'par';
  });

  // 저장 상태 표시
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const holes = (round.course?.holes as HoleInfo[]) ?? [];
  const storageKey = `${STORAGE_KEY_PREFIX}${round.id}`;

  // LocalStorage에서 스코어 복원
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const savedPlayers = JSON.parse(saved) as PlayerScore[];
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

  // 스코어 표시 모드 저장
  useEffect(() => {
    localStorage.setItem(SCORE_MODE_KEY, scoreDisplayMode);
  }, [scoreDisplayMode]);

  // 스코어 변경 시 LocalStorage에 저장
  const saveToStorage = useCallback(
    (updatedPlayers: PlayerScore[]) => {
      localStorage.setItem(storageKey, JSON.stringify(updatedPlayers));
    },
    [storageKey]
  );

  // 저장 상태 업데이트
  useEffect(() => {
    if (fetcher.state === 'submitting') {
      setSaveStatus('saving');
    } else if (fetcher.data?.success) {
      setSaveStatus('saved');
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.state, fetcher.data]);

  // 완료 후 리다이렉트
  useEffect(() => {
    if (fetcher.data?.completed) {
      localStorage.removeItem(storageKey);
      navigate(`/history/${round.id}`);
    }
  }, [fetcher.data, navigate, round.id, storageKey]);

  // 코스 변경 후 페이지 새로고침 (새 코스 정보 반영)
  useEffect(() => {
    if (fetcher.data?.courseUpdated) {
      navigate(0); // 페이지 새로고침
    }
  }, [fetcher.data?.courseUpdated, navigate]);

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

  const handleDateTimeSave = () => {
    fetcher.submit(
      {
        intent: 'updateRoundInfo',
        playDate: format(editPlayDate, 'yyyy-MM-dd'),
        teeTime: editTeeTime,
      },
      { method: 'POST' }
    );
    setDateTimeSheet(false);
  };

  const handleCourseSave = () => {
    if (!selectedCourseId) return;
    fetcher.submit(
      {
        intent: 'updateCourse',
        courseId: selectedCourseId,
      },
      { method: 'POST' }
    );
    setCourseSheet(false);
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

  // 플레이한 홀의 파 합계 계산
  const calculatePlayedPar = (player: PlayerScore) => {
    const playedHoleNumbers = Object.keys(player.scores).map(Number);
    return holes
      .filter((h) => playedHoleNumbers.includes(h.hole))
      .reduce((sum, h) => sum + h.par, 0);
  };

  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

  const getPlayerColor = (index: number) => {
    const colors = ['bg-primary', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500'];
    return colors[index] || 'bg-gray-500';
  };

  // 날짜/시간 포맷
  const formatPlayDate = () => {
    if (!round.playDate) return '날짜 미설정';
    const date = parse(round.playDate, 'yyyy-MM-dd', new Date());
    return format(date, 'M월 d일 (EEE)', { locale: ko });
  };

  const formatTeeTime = () => {
    if (!round.teeTime) return '';
    const [h, m] = round.teeTime.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour < 12 ? '오전' : '오후';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${ampm} ${displayHour}시 ${m}분`;
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* 헤더 */}
      <div className="sticky safe-top z-10 bg-background border-b pt-safe">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
          <button
            onClick={() => setCourseSheet(true)}
            className="text-center hover:bg-accent/50 px-2 py-1 rounded-md transition-colors"
          >
            <div className="flex items-center justify-center gap-1">
              <MapPinIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <h1 className="font-semibold text-sm">
                {round.course?.name || '코스 미지정'}
              </h1>
              <span className="text-[10px] text-muted-foreground">(수정)</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Par {totalPar}</span>
              {/* 자동 저장 인디케이터 */}
              {saveStatus === 'saving' && (
                <span className="text-yellow-600 animate-pulse">저장 중...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-green-600 flex items-center gap-0.5">
                  <CheckIcon className="w-3 h-3" />
                  저장됨
                </span>
              )}
            </div>
          </button>
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

      {/* 날짜/시간 표시 (클릭하여 수정) */}
      <button
        onClick={() => setDateTimeSheet(true)}
        className="w-full px-4 py-2.5 flex items-center justify-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors border-b"
      >
        <div className="flex items-center gap-1.5 text-sm">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <span>{formatPlayDate()}</span>
        </div>
        {round.teeTime && (
          <>
            <span className="text-muted-foreground">·</span>
            <div className="flex items-center gap-1.5 text-sm">
              <ClockIcon className="w-4 h-4 text-muted-foreground" />
              <span>{formatTeeTime()}</span>
            </div>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-1">(수정)</span>
      </button>

      {/* 스코어 요약 */}
      <Card className="mx-4 mt-4">
        <CardContent className="py-3">
          <div className="flex justify-around">
            {players.map((player, index) => {
              const total = calculateTotalForPlayer(player);
              const playedPar = calculatePlayedPar(player);
              const diff = total - playedPar;
              const hasScores = Object.keys(player.scores).length > 0;

              return (
                <div key={player.id} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs text-white',
                        getPlayerColor(index)
                      )}
                    >
                      {player.name.charAt(0)}
                    </span>
                    <p className="text-xs text-muted-foreground truncate max-w-14">
                      {player.name}
                    </p>
                  </div>
                  <p className="text-xl font-bold">
                    {hasScores ? (scoreDisplayMode === 'par' ? formatScoreToPar(diff) : total) : '-'}
                  </p>
                  {hasScores && scoreDisplayMode === 'par' && (
                    <p className="text-xs text-muted-foreground">({total}타)</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 스코어 표시 모드 토글 */}
      <div className="flex items-center justify-center gap-2 px-4 mt-3">
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

      {/* 전반/후반 탭 스코어 테이블 */}
      <Card className="mx-4 mt-3">
        <CardContent className="p-2">
          <Tabs defaultValue="front" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-2">
              <TabsTrigger value="front">전반 (OUT)</TabsTrigger>
              <TabsTrigger value="back">후반 (IN)</TabsTrigger>
            </TabsList>
            <TabsContent value="front" className="mt-0">
              <VerticalScoreTable
                holes={holes}
                players={players}
                onCellClick={handleCellClick}
                isFirstNine={true}
                scoreDisplayMode={scoreDisplayMode}
              />
            </TabsContent>
            <TabsContent value="back" className="mt-0">
              <VerticalScoreTable
                holes={holes}
                players={players}
                onCellClick={handleCellClick}
                isFirstNine={false}
                scoreDisplayMode={scoreDisplayMode}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 자동 저장 안내 */}
      <p className="text-center text-xs text-muted-foreground mt-3 px-4">
        스코어는 입력 시 자동으로 저장됩니다
      </p>

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
          scoreDisplayMode={scoreDisplayMode}
        />
      )}

      {/* 날짜/시간 수정 시트 */}
      <Sheet open={dateTimeSheet} onOpenChange={setDateTimeSheet}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>날짜 & 시간 수정</SheetTitle>
            <SheetDescription>
              라운드 날짜와 티오프 시간을 수정하세요
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                날짜
              </label>
              <DatePicker
                value={editPlayDate}
                onChange={(date) => date && setEditPlayDate(date)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                티오프 시간 (선택)
              </label>
              <TimePicker
                value={editTeeTime}
                onChange={(time) => setEditTeeTime(time)}
                placeholder="시간을 선택하세요"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDateTimeSheet(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleDateTimeSave}
                className="flex-1"
                disabled={fetcher.state !== 'idle'}
              >
                저장
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 코스 수정 시트 */}
      <Sheet open={courseSheet} onOpenChange={setCourseSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh]">
          <SheetHeader className="pb-4">
            <SheetTitle>골프 코스 변경</SheetTitle>
            <SheetDescription>
              다른 코스를 선택하세요
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            {courses.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-muted-foreground mb-3">
                  등록된 코스가 없습니다
                </p>
                <Link to="/courses">
                  <Button variant="outline" size="sm">
                    코스 등록하기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pt-4">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    selected={selectedCourseId === course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCourseSheet(false);
                  setSelectedCourseId(round.course?.id || null);
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleCourseSave}
                className="flex-1"
                disabled={fetcher.state !== 'idle' || !selectedCourseId || selectedCourseId === round.course?.id}
              >
                변경
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
