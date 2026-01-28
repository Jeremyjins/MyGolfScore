// Club Stats Section - 전체 클럽 통계 섹션
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import type { UserClubStats } from '~/types';

interface ClubStatsSectionProps {
  stats: UserClubStats;
}

export function ClubStatsSection({ stats }: ClubStatsSectionProps) {
  const { totalRounds, averagePutts, puttDistribution, clubUsageAverage } = stats;

  // 통계 데이터가 없으면 표시하지 않음
  if (totalRounds === 0 || !clubUsageAverage || clubUsageAverage.length === 0) {
    return null;
  }

  // 퍼팅 분포 막대 너비 계산 (최대 비율 기준)
  const maxPercentage = puttDistribution
    ? Math.max(...puttDistribution.map((d) => d.percentage || 0))
    : 0;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">클럽 통계 ({totalRounds} 라운드)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 평균 퍼팅 */}
        {averagePutts !== null && (
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-sm text-muted-foreground">평균 퍼팅</span>
              <span className="text-xl font-bold">{averagePutts}퍼트/라운드</span>
            </div>

            {/* 퍼팅 분포 막대 차트 */}
            {puttDistribution && puttDistribution.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">퍼팅 분포</p>
                <div className="space-y-1.5">
                  {[0, 1, 2, 3, 4].map((puttNum) => {
                    const dist = puttDistribution.find((d) => d.putts === puttNum);
                    const percentage = dist?.percentage || 0;
                    const barWidth =
                      maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;

                    return (
                      <div key={puttNum} className="flex items-center gap-2">
                        <span className="w-14 text-xs text-muted-foreground">
                          {puttNum === 4 ? '4퍼트+' : `${puttNum}퍼트`}
                        </span>
                        <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor:
                                puttNum === 0
                                  ? '#eab308' // yellow-500
                                  : puttNum === 1
                                  ? '#22c55e' // green-500
                                  : puttNum === 2
                                  ? '#3b82f6' // blue-500
                                  : puttNum === 3
                                  ? '#f97316' // orange-500
                                  : '#ef4444', // red-500
                            }}
                          />
                        </div>
                        <span className="w-12 text-xs text-right">
                          {percentage > 0 ? `${percentage}%` : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 클럽별 18홀 평균 사용회수 */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">18홀 평균 사용회수</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-1.5 px-2 text-left font-medium">클럽</th>
                  <th className="py-1.5 px-2 text-right font-medium">평균</th>
                </tr>
              </thead>
              <tbody>
                {clubUsageAverage.map((club) => (
                  <tr key={club.code} className="border-b last:border-0">
                    <td className="py-1.5 px-2">
                      <span className="font-medium">{club.code}</span>
                      <span className="text-muted-foreground ml-1.5">
                        {club.name}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium">
                      {club.averageUsage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
