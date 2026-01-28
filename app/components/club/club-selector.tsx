// Club Selector Component - 사용자 클럽 선택 토글 그리드
import { useFetcher } from 'react-router';
import { cn } from '~/lib/utils';
import type { Club } from '~/types';

interface ClubSelectorProps {
  allClubs: Club[];
  userClubIds: string[];
}

// 카테고리별 그룹핑
const CATEGORY_LABELS: Record<string, string> = {
  DRIVER: '드라이버',
  WOOD: '우드',
  HYBRID: '하이브리드',
  IRON: '아이언',
  WEDGE: '웨지',
  PUTTER: '퍼터',
};

const CATEGORY_ORDER = ['DRIVER', 'WOOD', 'HYBRID', 'IRON', 'WEDGE', 'PUTTER'];

export function ClubSelector({ allClubs, userClubIds }: ClubSelectorProps) {
  const fetcher = useFetcher();

  // 카테고리별 클럽 그룹화
  const clubsByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    clubs: allClubs.filter((club) => club.category === category),
  }));

  const handleToggle = (clubId: string, isSelected: boolean) => {
    fetcher.submit(
      {
        intent: 'toggleClub',
        clubId,
        action: isSelected ? 'remove' : 'add',
      },
      { method: 'POST' }
    );
  };

  const isSubmitting = fetcher.state === 'submitting';
  const pendingClubId = isSubmitting
    ? fetcher.formData?.get('clubId')?.toString()
    : null;

  return (
    <div className="space-y-4">
      {clubsByCategory.map(({ category, label, clubs }) => (
        <div key={category}>
          <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
          <div className="flex flex-wrap gap-2">
            {clubs.map((club) => {
              const isSelected = userClubIds.includes(club.id);
              const isPending = pendingClubId === club.id;

              return (
                <button
                  key={club.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggle(club.id, isSelected)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    'border-2',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-muted hover:border-primary/50',
                    isPending && 'opacity-50 cursor-wait'
                  )}
                >
                  {club.code}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
