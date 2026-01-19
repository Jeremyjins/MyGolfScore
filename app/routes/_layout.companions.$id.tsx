// Companion Detail Page
import { useState, useEffect } from 'react';
import { Link, useFetcher, useNavigate } from 'react-router';
import type { Route } from './+types/_layout.companions.$id';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { ArrowLeftIcon, EditIcon, DeleteIcon, UserIcon, TrendingUpIcon, TrophyIcon } from '~/components/ui/icons';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatScoreToPar } from '~/lib/score-utils';
import type { Companion } from '~/types';
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

export { loader, action } from '~/loaders/companions-detail.server';

// Chart configuration
const scoreChartConfig: ChartConfig = {
  score: {
    label: '스코어',
    color: '#f97316', // orange-500
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

const distributionChartConfig: ChartConfig = {
  count: {
    label: '횟수',
    color: '#f97316',
  },
};

// Color mapping for score distribution
const getScoreColor = (name: string) => {
  const colors: Record<string, string> = {
    eagle: '#eab308', // yellow-500
    birdie: '#22c55e', // green-500
    par: '#3b82f6', // blue-500
    bogey: '#f97316', // orange-500
    double: '#ef4444', // red-500
    triple_plus: '#dc2626', // red-600
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

    if (count < 3) return null;

    const recentRounds = availableRounds.slice(-20);
    const numToUse = Math.max(1, Math.ceil(recentRounds.length * 0.4));

    const sortedScores = [...recentRounds]
      .map((r) => r.score)
      .sort((a, b) => a - b)
      .slice(0, numToUse);

    const average = sortedScores.reduce((a, b) => a + b, 0) / sortedScores.length;
    return Math.round(average * 0.96 * 10) / 10;
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

interface RoundHistory {
  id: string;
  play_date: string;
  course_name: string;
  total_score: number | null;
  score_to_par: number | null;
}

interface RoundData {
  date: string;
  score: number;
  totalStrokes: number;
}

interface ScoreDistribution {
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  double: number;
  triple_plus: number;
}

interface Stats {
  totalRounds: number;
  averageScore: number;
  bestScore: number | null;
  handicap: number;
  roundHistory: RoundData[];
  scoreDistribution: ScoreDistribution;
}

export default function CompanionDetailPage({
  loaderData,
}: Route.ComponentProps) {
  const { companion, roundHistory, stats } = loaderData as {
    companion: Companion;
    roundHistory: RoundHistory[];
    stats: Stats;
  };
  const fetcher = useFetcher<{ redirect?: string }>();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(companion.name);

  // 삭제 후 리다이렉트
  useEffect(() => {
    if (fetcher.data?.redirect) {
      navigate(fetcher.data.redirect);
    }
  }, [fetcher.data?.redirect, navigate]);

  const handleUpdate = () => {
    if (!editName.trim()) return;

    fetcher.submit(
      { intent: 'update', name: editName },
      { method: 'POST' }
    );

    setIsEditDialogOpen(false);
  };

  const handleDelete = () => {
    fetcher.submit({ intent: 'delete' }, { method: 'POST' });
  };

  // Transform roundHistory for line chart
  const lineChartData = (stats.roundHistory || []).map((round) => ({
    date: format(parseISO(round.date), 'M/d'),
    score: round.score,
    totalStrokes: round.totalStrokes,
    fullDate: round.date,
  }));

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
      <Header
        title={companion.name}
        leftAction={
          <Link to="/companions">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
        }
        rightAction={
          <div className="flex gap-1">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <EditIcon className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>이름 수정</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="editName">이름</Label>
                    <Input
                      id="editName"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleUpdate();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleUpdate}
                    disabled={!editName.trim() || fetcher.state !== 'idle'}
                    className="w-full"
                  >
                    저장
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <DeleteIcon className="w-5 h-5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>동반자 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    {companion.name}님을 삭제하시겠습니까? 라운드 기록에서는
                    유지됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {/* 프로필 카드 */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{companion.name}</h2>
            <p className="text-sm text-muted-foreground">
              {stats.totalRounds}회 함께 라운딩
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      {stats.totalRounds > 0 && (
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
                {stats.bestScore !== null ? formatScoreToPar(stats.bestScore) : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <span className="text-xs text-muted-foreground">평균 스코어</span>
              <p className="text-2xl font-bold">
                {stats.averageScore !== 0 ? formatScoreToPar(stats.averageScore) : '-'}
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
      )}

      {/* 스코어 추이 차트 */}
      {lineChartData.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">스코어 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={scoreChartConfig} className="h-[180px] w-full">
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

      {/* 핸디캡 추이 차트 */}
      {roundCount > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">핸디캡 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasHandicapTrendData ? (
              <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
                라운드 3개 이상 기록 시 핸디캡 추이가 표시됩니다
              </div>
            ) : (
              <ChartContainer config={handicapChartConfig} className="h-[140px] w-full">
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

      {/* 평균 스코어 추이 차트 */}
      {hasAverageTrendData && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">평균 스코어 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={averageChartConfig} className="h-[140px] w-full">
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

      {/* 홀별 스코어 분포 차트 */}
      {hasDistributionData && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">홀별 스코어 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={distributionChartConfig} className="h-[160px] w-full">
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

      {/* 라운드 기록 */}
      {roundHistory.length > 0 ? (
        <div>
          <h3 className="font-semibold mb-3">함께한 라운드</h3>
          <div className="space-y-2">
            {roundHistory.map((round) => (
              <Link key={round.id} to={`/history/${round.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer py-2">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{round.course_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(round.play_date), 'yyyy년 M월 d일', {
                          locale: ko,
                        })}
                      </p>
                    </div>
                    {round.total_score !== null && (
                      <div className="text-right">
                        <p className="font-bold">{round.total_score}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatScoreToPar(round.score_to_par || 0)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-muted-foreground">
              아직 함께한 라운드가 없습니다
            </p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
