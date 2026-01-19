// Stats Cards Component - 통계 카드 그리드
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import {
  TrendingUpIcon,
  TrophyIcon,
  TargetIcon,
  CalendarCheckIcon,
  InfoIcon,
} from '~/components/ui/icons';
import { formatScoreToPar } from '~/lib/score-utils';

interface StatsCardsProps {
  /** 핸디캡 값 */
  handicap: number;
  /** 베스트 스코어 (파 대비) */
  bestScore: number;
  /** 평균 스코어 (파 대비) */
  averageScore: number | null;
  /** 총 라운드 수 */
  totalRounds: number;
  /** 카드 간격을 위한 margin-bottom 클래스 (기본: mb-8) */
  className?: string;
}

export function StatsCards({
  handicap,
  bestScore,
  averageScore,
  totalRounds,
  className = 'mb-8',
}: StatsCardsProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {/* 핸디캡 카드 with Info Popover */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">핸디캡</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
                  <InfoIcon className="w-4 h-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 text-sm" side="bottom" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold">핸디캡 계산 방법</h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    핸디캡은 최근 20라운드 중 상위 8개(가장 낮은) 스코어의 평균을 기준으로 계산됩니다.
                  </p>
                  <div className="text-xs space-y-1 bg-muted/50 p-2 rounded">
                    <p><strong>계산 공식:</strong></p>
                    <p>1. 최근 20라운드의 스코어 수집</p>
                    <p>2. 각 라운드의 파 대비 스코어 계산</p>
                    <p>3. 상위 8개 스코어 선별</p>
                    <p>4. 8개 스코어의 평균 × 0.96</p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    * 라운드가 20개 미만일 경우 가용 라운드의 약 40%를 사용합니다.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-2xl font-bold">
            {handicap > 0 ? handicap.toFixed(1) : '-'}
          </p>
        </CardContent>
      </Card>

      {/* 베스트 스코어 카드 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrophyIcon className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">베스트</span>
          </div>
          <p className="text-2xl font-bold">
            {bestScore !== 0 ? formatScoreToPar(bestScore) : '-'}
          </p>
        </CardContent>
      </Card>

      {/* 평균 스코어 카드 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <TargetIcon className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">평균 스코어</span>
          </div>
          <p className="text-2xl font-bold">
            {averageScore !== null ? formatScoreToPar(averageScore) : '-'}
          </p>
        </CardContent>
      </Card>

      {/* 총 라운드 카드 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheckIcon className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">총 라운드</span>
          </div>
          <p className="text-2xl font-bold">{totalRounds}회</p>
        </CardContent>
      </Card>
    </div>
  );
}
