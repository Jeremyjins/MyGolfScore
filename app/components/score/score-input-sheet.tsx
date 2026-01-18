// Score Input Bottom Sheet Component
import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '~/components/ui/sheet';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { ScoreDisplayMode } from '~/components/score/vertical-score-table';

interface ScoreInputSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holeNumber: number;
  par: number;
  currentScore: number | null;
  playerName: string;
  onScoreChange: (score: number) => void;
  scoreDisplayMode?: ScoreDisplayMode;
}

interface ScoreOption {
  score: number;
  diff: number;
  label: string;
}

// Par별 스코어 옵션 생성
function getScoreOptionsForPar(par: number): ScoreOption[] {
  if (par === 3) {
    // Par 3: 홀인원(-2) ~ 더블파(+3)
    return [
      { score: 1, diff: -2, label: '홀인원' },
      { score: 2, diff: -1, label: '버디' },
      { score: 3, diff: 0, label: '파' },
      { score: 4, diff: 1, label: '보기' },
      { score: 5, diff: 2, label: '더블보기' },
      { score: 6, diff: 3, label: '더블파' },
    ];
  } else if (par === 4) {
    // Par 4: 알바트로스(-3) ~ 더블파(+4)
    return [
      { score: 1, diff: -3, label: '알바트로스' },
      { score: 2, diff: -2, label: '이글' },
      { score: 3, diff: -1, label: '버디' },
      { score: 4, diff: 0, label: '파' },
      { score: 5, diff: 1, label: '보기' },
      { score: 6, diff: 2, label: '더블보기' },
      { score: 7, diff: 3, label: '트리플보기' },
      { score: 8, diff: 4, label: '더블파' },
    ];
  } else {
    // Par 5: 알바트로스(-3) ~ 더블파(+5)
    return [
      { score: 2, diff: -3, label: '알바트로스' },
      { score: 3, diff: -2, label: '이글' },
      { score: 4, diff: -1, label: '버디' },
      { score: 5, diff: 0, label: '파' },
      { score: 6, diff: 1, label: '보기' },
      { score: 7, diff: 2, label: '더블보기' },
      { score: 8, diff: 3, label: '트리플보기' },
      { score: 9, diff: 4, label: '쿼드러플보기' },
      { score: 10, diff: 5, label: '더블파' },
    ];
  }
}

// 스코어에 따른 라벨 반환 (커스텀 스코어용)
function getScoreLabelForCustom(score: number, par: number): string {
  const diff = score - par;

  // 특수 케이스: 홀인원 (Par 3에서 1타)
  if (par === 3 && score === 1) return '홀인원';

  // 더블파 체크
  if (score === par * 2) return '더블파';

  // 일반 케이스
  if (diff <= -3) return '알바트로스';
  if (diff === -2) return '이글';
  if (diff === -1) return '버디';
  if (diff === 0) return '파';
  if (diff === 1) return '보기';
  if (diff === 2) return '더블보기';
  if (diff === 3) return '트리플보기';
  if (diff === 4) return '쿼드러플보기';
  return `+${diff}`;
}

export function ScoreInputSheet({
  open,
  onOpenChange,
  holeNumber,
  par,
  currentScore,
  playerName,
  onScoreChange,
  scoreDisplayMode = 'par',
}: ScoreInputSheetProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(
    currentScore ?? par
  );

  // 시트가 열릴 때마다 선택값 초기화
  useEffect(() => {
    if (open) {
      setSelectedScore(currentScore ?? par);
    }
  }, [open, currentScore, par]);

  const scoreOptions = getScoreOptionsForPar(par);

  // 버튼에 표시할 숫자 (파 대비 or 타수)
  const getButtonDisplay = (diff: number, score: number) => {
    if (scoreDisplayMode === 'stroke') {
      return String(score);
    }
    if (diff === 0) return 'E';
    if (diff > 0) return `+${diff}`;
    return String(diff);
  };

  const getScoreColor = (diff: number, isSelected: boolean) => {
    if (!isSelected) return 'bg-muted hover:bg-muted/80 text-foreground';

    if (diff <= -2) return 'bg-yellow-500 text-white ring-2 ring-yellow-300'; // Eagle or better
    if (diff === -1) return 'bg-red-500 text-white ring-2 ring-red-300'; // Birdie
    if (diff === 0) return 'bg-green-500 text-white ring-2 ring-green-300'; // Par
    if (diff === 1) return 'bg-blue-500 text-white ring-2 ring-blue-300'; // Bogey
    if (diff === 2) return 'bg-blue-600 text-white ring-2 ring-blue-400'; // Double
    if (diff === 3) return 'bg-blue-700 text-white ring-2 ring-blue-500'; // Triple
    return 'bg-blue-800 text-white ring-2 ring-blue-600'; // Quadruple+
  };

  const handleConfirm = () => {
    if (selectedScore !== null) {
      onScoreChange(selectedScore);
      onOpenChange(false);
    }
  };

  // +/- 조정 핸들러
  const handleAdjust = (delta: number) => {
    if (selectedScore === null) {
      setSelectedScore(par);
    } else {
      const newScore = selectedScore + delta;
      if (newScore >= 1 && newScore <= 20) {
        setSelectedScore(newScore);
      }
    }
  };

  // 현재 선택된 스코어의 diff 계산
  const currentDiff = selectedScore !== null ? selectedScore - par : 0;
  const currentLabel = selectedScore !== null
    ? getScoreLabelForCustom(selectedScore, par)
    : '';

  // 선택된 스코어가 옵션에 있는지 확인
  const isCustomScore = selectedScore !== null &&
    !scoreOptions.some(opt => opt.score === selectedScore);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">
            {holeNumber}번 홀 - {playerName}
          </SheetTitle>
          <SheetDescription>
            Par {par} - 스코어를 선택하세요
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* 스코어 버튼 그리드 */}
          <div className="grid grid-cols-3 gap-2">
            {scoreOptions.map((option) => (
              <button
                key={option.score}
                onClick={() => setSelectedScore(option.score)}
                className={cn(
                  'h-16 rounded-xl flex flex-col items-center justify-center transition-all',
                  getScoreColor(option.diff, selectedScore === option.score)
                )}
              >
                <span className="text-lg font-bold">
                  {getButtonDisplay(option.diff, option.score)}
                </span>
                <span className="text-[11px] opacity-90 font-medium">
                  {option.label}
                </span>
              </button>
            ))}
          </div>

          {/* 선택된 스코어 표시 + 미세 조정 */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              {/* - 버튼 */}
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full text-xl font-bold"
                onClick={() => handleAdjust(-1)}
                disabled={selectedScore !== null && selectedScore <= 1}
              >
                −
              </Button>

              {/* 현재 스코어 */}
              <div className="text-center flex-1">
                <div className={cn(
                  'inline-flex flex-col items-center px-6 py-2 rounded-xl',
                  isCustomScore ? 'bg-orange-500/10' : ''
                )}>
                  <span className="text-3xl font-bold">
                    {selectedScore ?? '-'}타
                  </span>
                  <span className={cn(
                    'text-sm font-medium',
                    currentDiff < 0 ? 'text-red-500' :
                    currentDiff === 0 ? 'text-green-600' : 'text-blue-600'
                  )}>
                    {currentDiff > 0 ? '+' : ''}{currentDiff} ({currentLabel})
                  </span>
                </div>
              </div>

              {/* + 버튼 */}
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full text-xl font-bold"
                onClick={() => handleAdjust(1)}
                disabled={selectedScore !== null && selectedScore >= 20}
              >
                +
              </Button>
            </div>

            {isCustomScore && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                기본 옵션 외 스코어
              </p>
            )}
          </div>

          {/* 확인/취소 버튼 */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12"
            >
              취소
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedScore === null}
              className="flex-1 h-12"
            >
              확인
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
