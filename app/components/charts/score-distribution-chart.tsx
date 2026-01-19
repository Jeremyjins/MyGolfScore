// Score Distribution Chart Component
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts';

// Score distribution type from API
export interface ScoreDistribution {
  eagle?: number;
  birdie?: number;
  par?: number;
  bogey?: number;
  double?: number;
  triple_plus?: number;
}

interface ScoreDistributionChartProps {
  scoreDistribution: ScoreDistribution;
  roundCount: number;
  /** 차트 높이 (기본: 200px) */
  height?: number;
  /** 컴팩트 모드 - 홈 페이지용 (기본: false) */
  compact?: boolean;
}

// Chart configuration
const chartConfig: ChartConfig = {
  average: {
    label: '라운드당 평균',
    color: '#f97316',
  },
};

// Color mapping for score categories
const getScoreColor = (name: string) => {
  const colors: Record<string, string> = {
    eagle_or_better: '#eab308', // yellow-500 (Gold)
    birdie: '#22c55e', // green-500
    par: '#3b82f6', // blue-500
    bogey: '#f97316', // orange-500
    double: '#ef4444', // red-500
    triple_plus: '#dc2626', // red-600
  };
  return colors[name] || '#f97316';
};

// Label mapping
const labels: Record<string, string> = {
  eagle_or_better: '이글 이상',
  birdie: '버디',
  par: '파',
  bogey: '보기',
  double: '더블보기',
  triple_plus: '트리플+',
};

// Compact labels for home page
const compactLabels: Record<string, string> = {
  eagle_or_better: '≤-2',
  birdie: '-1',
  par: '0',
  bogey: '+1',
  double: '+2',
  triple_plus: '+3',
};

export function ScoreDistributionChart({
  scoreDistribution,
  roundCount,
  height = 200,
  compact = false,
}: ScoreDistributionChartProps) {
  const totalHoles = roundCount * 18;
  const labelMap = compact ? compactLabels : labels;

  // Transform data
  const rawDistribution = {
    eagle_or_better: scoreDistribution?.eagle || 0,
    birdie: scoreDistribution?.birdie || 0,
    par: scoreDistribution?.par || 0,
    bogey: scoreDistribution?.bogey || 0,
    double: scoreDistribution?.double || 0,
    triple_plus: scoreDistribution?.triple_plus || 0,
  };

  const chartData = Object.entries(rawDistribution).map(([name, count]) => ({
    name,
    label: labelMap[name],
    count,
    average: roundCount > 0 ? Math.round(count / roundCount * 10) / 10 : 0,
    percent: totalHoles > 0 ? Math.round(count / totalHoles * 1000) / 10 : 0,
  }));

  const hasData = chartData.some((d) => d.count > 0);

  if (!hasData) {
    return null;
  }

  return (
    <div>
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <BarChart
          data={chartData}
          margin={{ top: compact ? 15 : 25, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: compact ? 10 : 9, fill: '#6b7280' }}
            interval={0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            allowDecimals={true}
            width={compact ? 25 : 30}
          />
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const data = payload[0].payload as { label: string; average: number; percent: number; count: number };
              return (
                <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                  {compact ? (
                    <p className="font-medium">{data.average}개 ({data.percent}%)</p>
                  ) : (
                    <>
                      <p className="font-medium mb-1">{labels[payload[0].payload.name as string]}</p>
                      <p>라운드당 평균: <span className="font-semibold">{data.average}개</span></p>
                      <p>비율: <span className="font-semibold">{data.percent}%</span></p>
                      <p className="text-muted-foreground">총 {data.count}개</p>
                    </>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="average" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={getScoreColor(entry.name)} />
            ))}
            {!compact && (
              <LabelList
                dataKey="average"
                position="top"
                offset={5}
                fontSize={9}
                fill="#6b7280"
                formatter={(value: number) => value > 0 ? value.toFixed(1) : ''}
              />
            )}
          </Bar>
        </BarChart>
      </ChartContainer>
      {!compact && (
        <div className="flex justify-center mt-2 text-xs text-muted-foreground">
          <span>18홀 기준 라운드당 평균 개수</span>
        </div>
      )}
    </div>
  );
}
