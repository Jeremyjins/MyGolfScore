// Round Club Stats Card - 라운드 클럽/퍼팅 통계 카드
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import type { RoundClubStats } from '~/types';

interface RoundClubStatsCardProps {
  stats: RoundClubStats;
}

export function RoundClubStatsCard({ stats }: RoundClubStatsCardProps) {
  const { totalPutts, puttDistribution, clubUsage } = stats;

  // 통계 데이터가 없으면 표시하지 않음
  if (!clubUsage || clubUsage.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">라운드 통계</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 퍼팅 통계 */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm text-muted-foreground">전체 퍼팅</span>
            <span className="text-lg font-bold">{totalPutts}퍼트</span>
          </div>

          {puttDistribution && puttDistribution.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">퍼팅 분포</p>
              <div className="flex flex-wrap gap-2">
                {puttDistribution.map((dist) => (
                  <div
                    key={dist.putts}
                    className="flex items-center gap-1 text-xs"
                  >
                    <span className="text-muted-foreground">
                      {dist.putts === 4 ? '4+' : dist.putts}퍼트:
                    </span>
                    <span className="font-medium">{dist.count}홀</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 클럽 사용 */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">클럽 사용</p>
          <div className="flex flex-wrap gap-2">
            {clubUsage.map((club) => (
              <span
                key={club.code}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs"
              >
                <span className="font-medium">{club.code}</span>
                <span className="text-muted-foreground">({club.count})</span>
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
