// Companion Card Component
import { Link } from 'react-router';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { UserIcon, ChevronRightIcon } from '~/components/ui/icons';
import { cn } from '~/lib/utils';
import type { Companion, CompanionWithStats } from '~/types';

interface CompanionCardProps {
  companion: Companion | CompanionWithStats;
  onClick?: () => void;
  selected?: boolean;
  showStats?: boolean;
  roundCount?: number;
}

export function CompanionCard({
  companion,
  onClick,
  selected = false,
  showStats = false,
  roundCount,
}: CompanionCardProps) {
  const content = (
    <Card
      className={cn(
        'transition-all py-2',
        selected && 'ring-2 ring-primary',
        onClick && 'cursor-pointer hover:bg-accent/50'
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{companion.name}</p>
            {showStats && roundCount !== undefined && (
              <p className="text-sm text-muted-foreground">
                {roundCount}회 함께 라운딩
              </p>
            )}
          </div>
        </div>
        {!onClick && (
          <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
        )}
        {selected && (
          <Badge variant="default">선택됨</Badge>
        )}
      </CardContent>
    </Card>
  );

  if (!onClick) {
    return (
      <Link to={`/companions/${companion.id}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
