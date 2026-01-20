// Home Dashboard Page
import { Link } from 'react-router';
import type { Route } from './+types/_layout.home';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { GolfIcon } from '~/components/ui/icons';
import { StatsCards } from '~/components/stats/stats-cards';
import { ScoreDistributionChart } from '~/components/charts/score-distribution-chart';
import { ScoreTrendChart } from '~/components/charts/score-trend-chart';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export { loader } from '~/loaders/home.server';

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { userName, recentRounds, stats } = loaderData;

  // Calculate average score from roundHistory (par-relative)
  const roundHistory = stats.roundHistory || [];
  const averageScoreToPar = roundHistory.length > 0
    ? Math.round(roundHistory.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / roundHistory.length)
    : null;

  const roundCount = roundHistory.length;

  return (
    <PageContainer>
      {/* 헤더 */}
      <Header
        title={`안녕하세요, ${userName}님`}
        subtitle="오늘도 좋은 라운딩 되세요!"
      />

      {/* 라운드 시작 버튼 */}
      <Link to="/round/new" className="block mb-8">
        <Card className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
          <CardContent className="flex items-center justify-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <GolfIcon className="w-8 h-8" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold">라운드 시작</p>
              <p className="text-primary-foreground/80 text-sm">
                새로운 라운드를 시작하세요
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 내 통계 섹션 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">내 통계</h2>
        <Link
          to="/stats"
          className="text-sm text-primary hover:underline"
        >
          상세보기
        </Link>
      </div>

      {/* 통계 카드 - 공통 컴포넌트 사용 */}
      <StatsCards
        handicap={stats.handicap}
        bestScore={stats.bestScore}
        averageScore={averageScoreToPar}
        totalRounds={stats.totalRounds}
      />

      {/* 스코어 추이 - 공통 컴포넌트 사용 */}
      {roundHistory.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">스코어 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart
              roundHistory={roundHistory}
              height={180}
            />
          </CardContent>
        </Card>
      )}

      {/* 스코어 분포 - 공통 컴포넌트 사용 */}
      {roundCount > 0 && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">홀별 스코어 분포 (라운드당 평균)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreDistributionChart
              scoreDistribution={stats.scoreDistribution}
              roundCount={roundCount}
              height={220}
            />
          </CardContent>
        </Card>
      )}

      {/* 최근 라운드 */}
      {recentRounds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">최근 라운드</h2>
            <Link
              to="/history"
              className="text-sm text-primary hover:underline"
            >
              전체보기
            </Link>
          </div>
          <div className="space-y-4">
            {recentRounds.map((round: any) => {
              // 스코어 표시 포맷
              const scoreDisplay = round.myScore
                ? round.myScoreToPar !== null
                  ? round.myScoreToPar > 0
                    ? `${round.myScore} (+${round.myScoreToPar})`
                    : round.myScoreToPar < 0
                      ? `${round.myScore} (${round.myScoreToPar})`
                      : `${round.myScore} (E)`
                  : `${round.myScore}타`
                : null;

              return (
                <Link key={round.id} to={`/history/${round.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer py-2 mb-2">
                    <CardContent className="py-3 space-y-1">
                      {/* 첫째 줄: 코스명 + 날짜 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-medium truncate">
                            {round.course?.name || '코스 미지정'}
                          </p>
                          {round.status === 'in_progress' && (
                            <Badge variant="secondary" className="shrink-0 text-xs">진행중</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground shrink-0 ml-2">
                          {format(new Date(round.play_date), 'M월 d일 (E)', { locale: ko })}
                          {round.tee_time && ` ${round.tee_time.slice(0, 5)}`}
                        </p>
                      </div>
                      {/* 둘째 줄: 동반자 + 스코어 */}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">
                          {round.companions.length > 0 ? round.companions.join(', ') : '솔로 라운드'}
                        </p>
                        {scoreDisplay && (
                          <p className="text-base font-bold shrink-0 ml-2">{scoreDisplay}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 라운드가 없을 때 */}
      {recentRounds.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <GolfIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              아직 기록된 라운드가 없습니다
            </p>
            <Link to="/round/new">
              <Button>첫 라운드 시작하기</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
