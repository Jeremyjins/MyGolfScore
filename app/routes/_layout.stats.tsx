// Statistics Page
import type { Route } from './+types/_layout.stats';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { TrendingUpIcon, TrophyIcon } from '~/components/ui/icons';
import { formatScoreToPar } from '~/lib/score-utils';

export { loader } from '~/loaders/stats.server';

export default function StatsPage({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;

  return (
    <PageContainer>
      <Header title="통계" subtitle="나의 골프 성적" />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUpIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">핸디캡</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.handicap > 0 ? stats.handicap.toFixed(1) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrophyIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">베스트</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.bestScore !== 0 ? formatScoreToPar(stats.bestScore) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <span className="text-xs text-muted-foreground">평균 스코어</span>
            <p className="text-2xl font-bold">
              {stats.averageScore > 0 ? Math.round(stats.averageScore) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <span className="text-xs text-muted-foreground">총 라운드</span>
            <p className="text-2xl font-bold">{stats.totalRounds}회</p>
          </CardContent>
        </Card>
      </div>

      {/* 최근 스코어 추이 */}
      {stats.recentScores && stats.recentScores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">최근 성적 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {(stats.recentScores as number[]).slice(0, 10).map((score, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-primary/20 rounded-t"
                    style={{
                      height: `${Math.max(20, Math.min(100, 50 + score * 3))}%`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {formatScoreToPar(score)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.totalRounds === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">
              라운드를 기록하면 통계가 표시됩니다
            </p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
