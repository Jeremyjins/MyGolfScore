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
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '~/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { ScoreDistributionChart } from '~/components/charts/score-distribution-chart';

export { loader } from '~/loaders/home.server';

// Chart configuration
const scoreChartConfig: ChartConfig = {
  score: {
    label: '스코어',
    color: '#f97316', // orange-500
  },
};

// Format score for label display
const formatScoreForLabel = (value: unknown) => {
  if (value === undefined || value === null) return '';
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return '';
  return num > 0 ? `+${num}` : String(num);
};

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const { userName, recentRounds, stats } = loaderData;

  // Transform roundHistory for line chart
  const lineChartData = (stats.roundHistory || []).map((round) => ({
    date: format(parseISO(round.date), 'M/d'),
    score: round.score,
    totalStrokes: round.totalStrokes,
    fullDate: round.date,
  }));

  // Calculate average score from roundHistory (par-relative)
  const averageScoreToPar = lineChartData.length > 0
    ? Math.round(lineChartData.reduce((sum, r) => sum + r.score, 0) / lineChartData.length)
    : null;

  const roundCount = stats.roundHistory?.length || 0;

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

      {/* 최근 스코어 추이 - Line Chart with Labels */}
      {lineChartData.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">최근 성적</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={scoreChartConfig} className="h-[160px] w-full">
              <LineChart
                data={lineChartData}
                margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  domain={['dataMin - 3', 'dataMax + 3']}
                  tickFormatter={(value) => (value > 0 ? `+${value}` : String(value))}
                  width={30}
                />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <ChartTooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltipContent
                      active={active}
                      payload={payload}
                      label={label}
                      labelFormatter={(lbl, pl) => {
                        if (pl && pl[0]) {
                          const data = pl[0].payload as { fullDate: string };
                          return format(parseISO(data.fullDate), 'yyyy년 M월 d일');
                        }
                        return lbl;
                      }}
                    />
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#ea580c' }}
                  connectNulls
                >
                  <LabelList
                    dataKey="score"
                    position="top"
                    offset={8}
                    fontSize={9}
                    fill="#6b7280"
                    formatter={formatScoreForLabel}
                  />
                </Line>
              </LineChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-1 text-xs text-muted-foreground">
              <span>0 = 파</span>
              <span>- = 언더</span>
              <span>+ = 오버</span>
            </div>
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
            {recentRounds.map((round: any) => (
              <Link key={round.id} to={`/history/${round.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer py-2 mb-2">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">
                        {round.course?.name || '코스 미지정'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(round.play_date), 'yyyy년 M월 d일 (E)', {
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
