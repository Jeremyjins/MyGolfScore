// Club Input Panel - 샷별 클럽 선택 패널
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { Club, ClubShotInput } from '~/types';
import { XIcon } from '~/components/ui/icons';

interface ClubInputPanelProps {
  userClubs: Club[];
  selectedShots: ClubShotInput[];
  onAddShot: (club: Club) => void;
  onRemoveLastShot: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  expectedScore?: number | null; // 기존 스코어 (있는 경우)
}

// 카테고리별 그룹핑
const CATEGORY_ORDER = ['DRIVER', 'WOOD', 'HYBRID', 'IRON', 'WEDGE', 'PUTTER'] as const;

export function ClubInputPanel({
  userClubs,
  selectedShots,
  onAddShot,
  onRemoveLastShot,
  onConfirm,
  onCancel,
  expectedScore,
}: ClubInputPanelProps) {
  // 카테고리별 클럽 그룹화
  const clubsByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    clubs: userClubs.filter((club) => club.category === category),
  })).filter(({ clubs }) => clubs.length > 0);

  const totalShots = selectedShots.length;

  // 클럽 수와 기존 스코어 불일치 경고
  const showMismatchWarning =
    expectedScore !== undefined &&
    expectedScore !== null &&
    totalShots > 0 &&
    totalShots !== expectedScore;

  return (
    <div className="space-y-4">
      {/* 선택된 클럽 시퀀스 */}
      <div className="bg-muted/50 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">선택된 클럽</span>
          <span className={cn('text-sm font-bold', showMismatchWarning && 'text-orange-500')}>
            {totalShots}타
            {showMismatchWarning && ` (기존: ${expectedScore}타)`}
          </span>
        </div>
        {showMismatchWarning && (
          <p className="text-xs text-orange-500 mb-2">
            클럽 수가 기존 스코어와 다릅니다. 스코어가 {totalShots}타로 변경됩니다.
          </p>
        )}
        <div className="min-h-[36px] flex flex-wrap items-center gap-1.5">
          {selectedShots.length === 0 ? (
            <span className="text-sm text-muted-foreground">클럽을 선택하세요</span>
          ) : (
            selectedShots.map((shot, index) => (
              <span key={index} className="inline-flex items-center gap-1">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    shot.isPutt
                      ? 'bg-green-500 text-white'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {shot.clubCode}
                </span>
                {index < selectedShots.length - 1 && (
                  <span className="text-muted-foreground text-xs">→</span>
                )}
              </span>
            ))
          )}
        </div>
      </div>

      {/* 클럽 선택 버튼들 */}
      <div className="space-y-3">
        {clubsByCategory.map(({ category, clubs }) => (
          <div key={category} className="flex flex-wrap gap-1.5">
            {clubs.map((club) => (
              <button
                key={club.id}
                type="button"
                onClick={() => onAddShot(club)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  'bg-muted hover:bg-primary/20 active:bg-primary/30',
                  club.category === 'PUTTER' && 'bg-green-100 hover:bg-green-200'
                )}
              >
                {club.code}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* 하단 버튼 */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onRemoveLastShot}
          disabled={selectedShots.length === 0}
          className="flex-shrink-0"
        >
          <XIcon className="w-4 h-4 mr-1" />
          삭제
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          취소
        </Button>
        <Button
          onClick={onConfirm}
          disabled={selectedShots.length === 0}
          className="flex-1"
        >
          확인
        </Button>
      </div>
    </div>
  );
}
