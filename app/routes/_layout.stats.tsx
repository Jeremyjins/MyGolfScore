// Statistics Page
import type { Route } from './+types/_layout.stats';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { TrendingUpIcon, TrophyIcon, InfoIcon } from '~/components/ui/icons';
import { formatScoreToPar } from '~/lib/score-utils';
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
  BarChart,
  Bar,
  Cell,
  LabelList,
} from 'recharts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { format, parseISO } from 'date-fns';

export { loader } from '~/loaders/stats.server';

// Chart configuration
const scoreChartConfig: ChartConfig = {
  score: {
    label: '스코어',
    color: '#f97316', // orange-500
  },
  totalStrokes: {
    label: '총 타수',
    color: '#6b7280', // gray-500
  },
};

const distributionChartConfig: ChartConfig = {
  count: {
    label: '횟수',
    color: '#f97316',
  },
};

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

// Color mapping for score distribution
const getScoreColor = (name: string) => {
  const colors: Record<string, string> = {
    eagle: '#eab308', // yellow-500 (Gold for eagle)
    birdie: '#22c55e', // green-500 (Green for birdie)
    par: '#3b82f6', // blue-500 (Blue for par)
    bogey: '#f97316', // orange-500 (Orange for bogey)
    double: '#ef4444', // red-500 (Red for double)
    triple_plus: '#dc2626', // red-600 (Dark red for triple+)
  };
  return colors[name] || '#f97316';
};

// Score distribution label mapping
const distributionLabels: Record<string, string> = {
  eagle: '이글(-2)',
  birdie: '버디(-1)',
  par: '파(0)',
  bogey: '보기(+1)',
  double: '더블(+2)',
  triple_plus: '+3이상',
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

  // Calculate handicap and average history for trend charts
  const roundsForCalc = (stats.roundHistory || []).map((r) => ({ score: r.score }));
  const handicapHistory = calculateHandicapHistory(roundsForCalc);
  const averageHistory = calculateAverageHistory(roundsForCalc);

  // Transform for trend charts (use last 15 rounds for display)
  const trendChartData = (stats.roundHistory || [])
    .slice(-15)
    .map((round, index) => {
      const originalIndex = Math.max(0, (stats.roundHistory?.length || 0) - 15) + index;
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
  const roundCount = stats.roundHistory?.length || 0;

  // Transform scoreDistribution for bar chart
  const barChartData = [
    { name: 'eagle', label: distributionLabels.eagle, count: stats.scoreDistribution?.eagle || 0 },
    { name: 'birdie', label: distributionLabels.birdie, count: stats.scoreDistribution?.birdie || 0 },
    { name: 'par', label: distributionLabels.par, count: stats.scoreDistribution?.par || 0 },
    { name: 'bogey', label: distributionLabels.bogey, count: stats.scoreDistribution?.bogey || 0 },
    { name: 'double', label: distributionLabels.double, count: stats.scoreDistribution?.double || 0 },
    { name: 'triple_plus', label: distributionLabels.triple_plus, count: stats.scoreDistribution?.triple_plus || 0 },
  ];

  const hasDistributionData = barChartData.some((d) => d.count > 0);

  return (
    <PageContainer>
      <Header title="통계" subtitle="나의 골프 성적" />

      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* 핸디캡 카드 with ? 아이콘 */}
        <Card className="relative">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">핸디캡</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1">
                    <InfoIcon className="w-3.5 h-3.5 text-muted-foreground" />
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

        {/* 평균 스코어 - roundHistory에서 계산된 파 대비 스코어 */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <span className="text-xs text-muted-foreground">평균 스코어</span>
            <p className="text-2xl font-bold">
              {averageScoreToPar !== null ? formatScoreToPar(averageScoreToPar) : '-'}
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

      {/* 최근 스코어 추이 - Line Chart with Labels */}
      {lineChartData.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">스코어 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={scoreChartConfig} className="h-[220px] w-full">
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
                  dot={{ fill: '#f97316', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#ea580c' }}
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
            <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>0 = 파(Par)</span>
              <span>- = 언더파</span>
              <span>+ = 오버파</span>
            </div>
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

      {/* 스코어 분포 - Bar Chart */}
      {hasDistributionData && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">홀별 스코어 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={distributionChartConfig} className="h-[200px] w-full">
              <BarChart
                data={barChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  allowDecimals={false}
                  width={30}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltipContent
                      active={active}
                      payload={payload}
                      label={label}
                    />
                  )}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barChartData.map((entry) => (
                    <Cell key={entry.name} fill={getScoreColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
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
