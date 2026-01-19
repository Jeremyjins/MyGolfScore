// Statistics Page
import type { Route } from './+types/_layout.stats';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ScoreDistributionChart } from '~/components/charts/score-distribution-chart';
import { ScoreTrendChart } from '~/components/charts/score-trend-chart';
import { StatsCards } from '~/components/stats/stats-cards';
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
import { format, parseISO } from 'date-fns';

export { loader } from '~/loaders/stats.server';

// Chart configuration for handicap and average trend charts
const handicapChartConfig: ChartConfig = {
  handicap: {
    label: '핸디캡',
    color: '#22c55e', // green-500
  },
};

const averageChartConfig: ChartConfig = {
  average: {
    label: '평균 스코어',
    color: '#3b82f6', // blue-500
  },
};

// Format score for label display
const formatScoreForLabel = (value: unknown) => {
  if (value === undefined || value === null) return '';
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return '';
  return num > 0 ? `+${num}` : String(num);
};

// Format handicap for label display
const formatHandicapForLabel = (value: unknown) => {
  if (value === undefined || value === null) return '';
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return '';
  return num.toFixed(1);
};

// RoundData type for calculations
interface RoundDataForCalc {
  score: number;
}

// Calculate handicap at each point in round history
const calculateHandicapHistory = (rounds: RoundDataForCalc[]): (number | null)[] => {
  return rounds.map((_, index) => {
    const availableRounds = rounds.slice(0, index + 1);
    const count = availableRounds.length;

    if (count < 3) return null; // 최소 3라운드 필요

    // 최근 20개 라운드만 사용
    const recentRounds = availableRounds.slice(-20);
    // 약 40% 선택 (최소 1개)
    const numToUse = Math.max(1, Math.ceil(recentRounds.length * 0.4));

    const sortedScores = [...recentRounds]
      .map((r) => r.score)
      .sort((a, b) => a - b)
      .slice(0, numToUse);

    const average = sortedScores.reduce((a, b) => a + b, 0) / sortedScores.length;
    return Math.round(average * 0.96 * 10) / 10; // 소수점 1자리
  });
};

// Calculate running average at each point in round history
const calculateAverageHistory = (rounds: RoundDataForCalc[]): number[] => {
  return rounds.map((_, index) => {
    const availableRounds = rounds.slice(0, index + 1);
    const sum = availableRounds.reduce((acc, r) => acc + r.score, 0);
    return Math.round(sum / availableRounds.length);
  });
};

export default function StatsPage({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;

  // Calculate average score from roundHistory (par-relative)
  const roundHistory = stats.roundHistory || [];
  const averageScoreToPar = roundHistory.length > 0
    ? Math.round(roundHistory.reduce((sum, r) => sum + r.score, 0) / roundHistory.length)
    : null;

  // Calculate handicap and average history for trend charts
  const roundsForCalc = roundHistory.map((r) => ({ score: r.score }));
  const handicapHistory = calculateHandicapHistory(roundsForCalc);
  const averageHistory = calculateAverageHistory(roundsForCalc);

  // Transform for trend charts (use last 15 rounds for display)
  const trendChartData = roundHistory
    .slice(-15)
    .map((round, index) => {
      const originalIndex = Math.max(0, roundHistory.length - 15) + index;
      return {
        date: format(parseISO(round.date), 'M/d'),
        handicap: handicapHistory[originalIndex],
        average: averageHistory[originalIndex],
        fullDate: round.date,
      };
    });

  // Check if we have enough data for trend charts
  const hasHandicapTrendData = trendChartData.some((d) => d.handicap !== null);
  const hasAverageTrendData = trendChartData.length > 0;
  const roundCount = roundHistory.length;

  return (
    <PageContainer>
      <Header title="통계" subtitle="나의 골프 성적" />

      {/* 통계 카드 - 공통 컴포넌트 사용 */}
      <StatsCards
        handicap={stats.handicap}
        bestScore={stats.bestScore}
        averageScore={averageScoreToPar}
        totalRounds={stats.totalRounds}
        className="mb-6"
      />

      {/* 최근 스코어 추이 - 공통 컴포넌트 사용 */}
      {stats.roundHistory && stats.roundHistory.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">스코어 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart
              roundHistory={stats.roundHistory}
              height={220}
            />
          </CardContent>
        </Card>
      )}

      {/* 핸디캡 추이 - Line Chart */}
      {roundCount > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">핸디캡 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasHandicapTrendData ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                라운드 3개 이상 기록 시 핸디캡 추이가 표시됩니다
              </div>
            ) : (
            <ChartContainer config={handicapChartConfig} className="h-[180px] w-full">
              <LineChart
                data={trendChartData}
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
                  domain={['dataMin - 2', 'dataMax + 2']}
                  width={30}
                />
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
                  dataKey="handicap"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#16a34a' }}
                  connectNulls
                >
                  <LabelList
                    dataKey="handicap"
                    position="top"
                    offset={8}
                    fontSize={9}
                    fill="#6b7280"
                    formatter={formatHandicapForLabel}
                  />
                </Line>
              </LineChart>
            </ChartContainer>
            )}
            {hasHandicapTrendData && (
            <div className="flex justify-center mt-2 text-xs text-muted-foreground">
              <span>낮을수록 좋은 성적</span>
            </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 평균 스코어 추이 - Line Chart */}
      {hasAverageTrendData && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">평균 스코어 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={averageChartConfig} className="h-[180px] w-full">
              <LineChart
                data={trendChartData}
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
                  dataKey="average"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                  connectNulls
                >
                  <LabelList
                    dataKey="average"
                    position="top"
                    offset={8}
                    fontSize={9}
                    fill="#6b7280"
                    formatter={formatScoreForLabel}
                  />
                </Line>
              </LineChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>0 = 파(Par)</span>
              <span>해당 시점까지의 누적 평균</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 스코어 분포 - 공통 컴포넌트 사용 */}
      {roundCount > 0 && (
        <Card className="mb-4">
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
