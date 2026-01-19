// Score Trend Chart Component - 스코어 추이 라인 차트
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

// Format score for label display
const formatScoreForLabel = (value: unknown) => {
  if (value === undefined || value === null) return '';
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return '';
  return num > 0 ? `+${num}` : String(num);
};

interface RoundHistoryItem {
  date: string;
  score: number;
  totalStrokes: number;
}

interface ScoreTrendChartProps {
  /** 라운드 히스토리 데이터 */
  roundHistory: RoundHistoryItem[];
  /** 차트 높이 (기본: 220) */
  height?: number;
  /** 범례 텍스트 표시 여부 (기본: true) */
  showLegend?: boolean;
  /** 추가 클래스명 */
  className?: string;
}

export function ScoreTrendChart({
  roundHistory,
  height = 220,
  showLegend = true,
  className,
}: ScoreTrendChartProps) {
  // Transform roundHistory for line chart
  const lineChartData = roundHistory.map((round) => ({
    date: format(parseISO(round.date), 'M/d'),
    score: round.score,
    totalStrokes: round.totalStrokes,
    fullDate: round.date,
  }));

  if (lineChartData.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <ChartContainer config={scoreChartConfig} className={`w-full`} style={{ height }}>
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
      {showLegend && (
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>0 = 파(Par)</span>
          <span>- = 언더파</span>
          <span>+ = 오버파</span>
        </div>
      )}
    </div>
  );
}
