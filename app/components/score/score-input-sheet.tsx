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

// 고정된 diff 옵션 (-1 ~ +4)
const FIXED_DIFF_OPTIONS = [-1, 0, 1, 2, 3, 4] as const;

// diff에 따른 라벨 반환
function getDiffLabel(diff: number): string {
  if (diff <= -2) return '이글';
  if (diff === -1) return '버디';
  if (diff === 0) return '파';
  if (diff === 1) return '보기';
  if (diff === 2) return '더블보기';
  if (diff === 3) return '트리플보기';
  if (diff === 4) return '쿼드러플보기';
  return `+${diff}`;
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

  // diff를 실제 스코어로 변환
  const diffToScore = (diff: number) => par + diff;

  // 버튼에 표시할 텍스트 (파 대비 or 타수)
  const getButtonDisplay = (diff: number) => {
    if (scoreDisplayMode === 'stroke') {
      return String(diffToScore(diff));
    }
    if (diff === 0) return '0';
    if (diff > 0) return `+${diff}`;
    return String(diff);
  };

  // 현재 스코어 표시 (상단 영역용)
  const getCurrentScoreDisplay = () => {
    if (selectedScore === null) return '-';
    const diff = selectedScore - par;
    if (scoreDisplayMode === 'stroke') {
      return String(selectedScore);
    }
    if (diff === 0) return '0';
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

  // diff 버튼 클릭 핸들러
  const handleDiffSelect = (diff: number) => {
    const score = diffToScore(diff);
    if (score >= 1) {
      setSelectedScore(score);
    }
  };

  // 현재 선택된 스코어의 diff 계산
  const currentDiff = selectedScore !== null ? selectedScore - par : 0;
  const currentLabel = selectedScore !== null
    ? getScoreLabelForCustom(selectedScore, par)
    : '';

  // 선택된 스코어가 고정 옵션에 있는지 확인
  const isCustomScore = selectedScore !== null &&
    !FIXED_DIFF_OPTIONS.some(diff => diffToScore(diff) === selectedScore);

  // 버튼 비활성화 여부 (스코어가 1 미만이 되는 경우)
  const isDiffDisabled = (diff: number) => diffToScore(diff) < 1;

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
          {/* 현재 스코어 표시 + 미세 조정 (상단) */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              {/* - 버튼 */}
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full text-2xl font-bold"
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
                  <span className={cn(
                    'text-4xl font-bold',
                    currentDiff < 0 ? 'text-red-500' :
                    currentDiff === 0 ? 'text-green-600' : 'text-blue-600'
                  )}>
                    {getCurrentScoreDisplay()}
                  </span>
                  <span className="text-sm text-muted-foreground mt-1">
                    {selectedScore ?? '-'}타 · {currentLabel}
                  </span>
                </div>
              </div>

              {/* + 버튼 */}
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full text-2xl font-bold"
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

          {/* 고정 스코어 버튼 그리드 (2행 3열) */}
          <div className="space-y-2">
            {/* 상단 행: -1, 0, +1 (버디, 파, 보기) */}
            <div className="grid grid-cols-3 gap-2">
              {FIXED_DIFF_OPTIONS.slice(0, 3).map((diff) => {
                const score = diffToScore(diff);
                const isSelected = selectedScore === score;
                const disabled = isDiffDisabled(diff);
                return (
                  <button
                    key={diff}
                    onClick={() => handleDiffSelect(diff)}
                    disabled={disabled}
                    className={cn(
                      'h-16 rounded-xl flex flex-col items-center justify-center transition-all',
                      disabled
                        ? 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
                        : getScoreColor(diff, isSelected)
                    )}
                  >
                    <span className="text-lg font-bold">
                      {getButtonDisplay(diff)}
                    </span>
                    <span className="text-[11px] opacity-90 font-medium">
                      {getDiffLabel(diff)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 하단 행: +2, +3, +4 (더블보기, 트리플보기, 쿼드러플보기) */}
            <div className="grid grid-cols-3 gap-2">
              {FIXED_DIFF_OPTIONS.slice(3, 6).map((diff) => {
                const score = diffToScore(diff);
                const isSelected = selectedScore === score;
                const disabled = isDiffDisabled(diff);
                return (
                  <button
                    key={diff}
                    onClick={() => handleDiffSelect(diff)}
                    disabled={disabled}
                    className={cn(
                      'h-16 rounded-xl flex flex-col items-center justify-center transition-all',
                      disabled
                        ? 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
                        : getScoreColor(diff, isSelected)
                    )}
                  >
                    <span className="text-lg font-bold">
                      {getButtonDisplay(diff)}
                    </span>
                    <span className="text-[11px] opacity-90 font-medium">
                      {getDiffLabel(diff)}
                    </span>
                  </button>
                );
              })}
            </div>
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
