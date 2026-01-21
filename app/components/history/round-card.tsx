// Reusable Round Card Component
import { Link } from 'react-router';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatScoreToPar } from '~/lib/score-utils';

export interface RoundCardProps {
  id: string;
  courseName: string;
  playDate: string;
  teeTime: string | null;
  status: string;
  companions: string[];
  totalScore: number | null;
  scoreToPar: number | null;
}

export function RoundCard({
  id,
  courseName,
  playDate,
  teeTime,
  status,
  companions,
  totalScore,
  scoreToPar,
}: RoundCardProps) {
  // 스코어 표시 포맷
  const scoreDisplay = totalScore
    ? scoreToPar !== null
      ? `${totalScore} (${formatScoreToPar(scoreToPar)})`
      : `${totalScore}타`
    : null;

  return (
    <Link to={`/history/${id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer py-2 mb-2">
        <CardContent className="py-3 space-y-1">
          {/* 첫째 줄: 코스명 + 날짜 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-medium truncate">{courseName}</p>
              {status === 'in_progress' && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  진행중
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground shrink-0 ml-2">
              {format(new Date(playDate), 'M월 d일 (E)', { locale: ko })}
              {teeTime && ` ${teeTime.slice(0, 5)}`}
            </p>
          </div>
          {/* 둘째 줄: 동반자 + 스코어 */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground truncate">
              {companions.length > 0 ? companions.join(', ') : '솔로 라운드'}
            </p>
            {scoreDisplay && (
              <p className="text-base font-bold shrink-0 ml-2">{scoreDisplay}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
