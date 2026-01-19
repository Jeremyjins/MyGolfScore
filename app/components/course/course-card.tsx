// Course Card Component
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { StarIcon } from '~/components/ui/icons';
import { cn } from '~/lib/utils';
import type { Course, HoleInfo } from '~/types';

interface CourseCardProps {
  course: Course;
  onClick?: () => void;
  onFavoriteToggle?: () => void;
  selected?: boolean;
}

export function CourseCard({
  course,
  onClick,
  onFavoriteToggle,
  selected = false,
}: CourseCardProps) {
  const holes = course.holes as HoleInfo[];
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer py-2 mb-2',
        selected && 'ring-2 ring-primary',
        onClick && 'hover:bg-accent/50'
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onFavoriteToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle();
              }}
              className="p-1 rounded-full hover:bg-accent"
            >
              <StarIcon
                className={cn(
                  'w-5 h-5 transition-colors',
                  course.is_favorite
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          )}
          <div>
            <p className="font-medium">{course.name}</p>
            <p className="text-sm text-muted-foreground">Par {totalPar}</p>
          </div>
        </div>
        {course.is_favorite && !onFavoriteToggle && (
          <Badge variant="secondary" className="gap-1">
            <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            즐겨찾기
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
