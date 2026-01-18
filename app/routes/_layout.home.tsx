// Home Dashboard Page
import { Link } from 'react-router';
import type { Route } from './+types/_layout.home';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { GolfIcon, TrendingUpIcon, TrophyIcon, TargetIcon, CalendarCheckIcon } from '~/components/ui/icons';
import { formatScoreToPar } from '~/lib/score-utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export { loader } from '~/loaders/home.server';

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { userName, recentRounds, stats } = loaderData;

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

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUpIcon className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">핸디캡</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.handicap > 0 ? stats.handicap.toFixed(1) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrophyIcon className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">베스트</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.bestScore !== 0 ? formatScoreToPar(stats.bestScore) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TargetIcon className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">평균 스코어</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.averageScore > 0 ? Math.round(stats.averageScore) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheckIcon className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">총 라운드</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalRounds}회</p>
          </CardContent>
        </Card>
      </div>

      {/* 최근 스코어 추이 */}
      {stats.recentScores && stats.recentScores.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">최근 성적</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-16">
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
            {recentRounds.slice(0, 3).map((round: any) => (
              <Link key={round.id} to={`/history/${round.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer py-2 mb-2">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">
                        {round.course?.name || '코스 미지정'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(round.play_date), 'M월 d일 (E)', {
                          locale: ko,
                        })}
                        {round.tee_time && ` ${round.tee_time.slice(0, 5)}`}
                      </p>
                    </div>
                    <Badge
                      variant={
                        round.status === 'completed' ? 'default' : 'secondary'
                      }
                    >
                      {round.status === 'completed' ? '완료' : '진행중'}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
