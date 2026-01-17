// Score Input Bottom Sheet Component
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface ScoreInputSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holeNumber: number;
  par: number;
  currentScore: number | null;
  playerName: string;
  onScoreChange: (score: number) => void;
}

export function ScoreInputSheet({
  open,
  onOpenChange,
  holeNumber,
  par,
  currentScore,
  playerName,
  onScoreChange,
}: ScoreInputSheetProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(
    currentScore
  );

  // 점수 범위: 1 ~ 15 (현실적인 골프 스코어)
  const scores = Array.from({ length: 15 }, (_, i) => i + 1);

  const getScoreLabel = (score: number) => {
    const diff = score - par;
    if (diff === -3) return '알바트로스';
    if (diff === -2) return '이글';
    if (diff === -1) return '버디';
    if (diff === 0) return '파';
    if (diff === 1) return '보기';
    if (diff === 2) return '더블보기';
    if (diff === 3) return '트리플보기';
    if (diff > 3) return `+${diff}`;
    return '';
  };

  const getScoreColor = (score: number) => {
    const diff = score - par;
    if (diff <= -2) return 'bg-yellow-500 text-white'; // Eagle or better
    if (diff === -1) return 'bg-red-500 text-white'; // Birdie
    if (diff === 0) return 'bg-green-500 text-white'; // Par
    if (diff === 1) return 'bg-blue-500 text-white'; // Bogey
    if (diff === 2) return 'bg-blue-700 text-white'; // Double
    return 'bg-blue-900 text-white'; // Triple+
  };

  const handleConfirm = () => {
    if (selectedScore !== null) {
      onScoreChange(selectedScore);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh]">
        <SheetHeader className="pb-4">
          <SheetTitle>
            {holeNumber}번 홀 - {playerName}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">Par {par}</p>
        </SheetHeader>

        <div className="space-y-4">
          {/* 스코어 그리드 */}
          <div className="grid grid-cols-5 gap-2">
            {scores.map((score) => (
              <button
                key={score}
                onClick={() => setSelectedScore(score)}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center transition-all',
                  selectedScore === score
                    ? getScoreColor(score)
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                <span className="text-xl font-bold">{score}</span>
                {score >= par - 2 && score <= par + 3 && (
                  <span className="text-[10px] opacity-80">
                    {getScoreLabel(score)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 선택된 스코어 표시 */}
          {selectedScore !== null && (
            <div className="text-center py-2">
              <span className="text-2xl font-bold">{selectedScore}타</span>
              <span className="text-muted-foreground ml-2">
                ({selectedScore - par >= 0 ? '+' : ''}
                {selectedScore - par})
              </span>
            </div>
          )}

          {/* 확인 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedScore === null}
              className="flex-1"
            >
              확인
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
