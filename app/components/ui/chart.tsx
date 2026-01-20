// Chart components based on shadcn/ui chart
import * as React from 'react';
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';
import { cn } from '~/lib/utils';

// Chart configuration type
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<'light' | 'dark', string>;
  };
};

// Chart context for sharing config
type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }

  return context;
}

// ChartContainer component
interface ChartContainerProps extends React.ComponentProps<'div'> {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>['children'];
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, style, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

    // style에서 height 추출 (ResponsiveContainer에 명시적으로 전달)
    const containerHeight = style?.height;

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            "flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
            className
          )}
          style={style}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <ResponsiveContainer
            width="100%"
            height={containerHeight || "100%"}
            minWidth={0}
            minHeight={containerHeight ? undefined : 0}
          >
            {children}
          </ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  }
);
ChartContainer.displayName = 'ChartContainer';

// ChartStyle component for CSS variables
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.color || itemConfig.theme
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
${colorConfig
  .map(([key, itemConfig], index) => {
    const color =
      itemConfig.color ||
      itemConfig.theme?.light ||
      `hsl(var(--chart-${index + 1}))`;
    return `
[data-chart="${id}"] {
  --color-${key}: ${color};
}
`;
  })
  .join('')}
`,
      }}
    />
  );
};

// Payload item type for tooltips
interface PayloadItem {
  name?: string;
  dataKey?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

// ChartTooltip component
const ChartTooltip = RechartsTooltip;

interface ChartTooltipContentProps extends React.ComponentProps<'div'> {
  active?: boolean;
  payload?: readonly PayloadItem[] | PayloadItem[];
  label?: string | number;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'line' | 'dot' | 'dashed';
  nameKey?: string;
  labelKey?: string;
  labelFormatter?: (label: string, payload: PayloadItem[]) => React.ReactNode;
  labelClassName?: string;
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      label,
      labelFormatter,
      labelClassName,
      hideLabel = false,
      hideIndicator = false,
      indicator = 'dot',
      nameKey,
      className,
    },
    ref
  ) => {
    const { config } = useChart();

    const payloadArray = payload ? [...payload] : [];

    if (!active || !payloadArray.length) {
      return null;
    }

    const nestLabel = payloadArray.length === 1 && indicator !== 'dot';
    const labelStr = String(label ?? '');

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
          className
        )}
      >
        {!nestLabel && !hideLabel ? (
          <div className={cn('font-medium', labelClassName)}>
            {labelFormatter
              ? labelFormatter(labelStr, payloadArray)
              : labelStr}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          {payloadArray.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`;
            const itemConfig = config[key] || config[item.dataKey as string] || {};
            const indicatorColor = item.color || itemConfig.color || (item.payload?.fill as string);

            return (
              <div
                key={`${item.dataKey}-${index}`}
                className={cn(
                  'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                  indicator === 'dot' && 'items-center'
                )}
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                      {
                        'h-2.5 w-2.5': indicator === 'dot',
                        'w-1': indicator === 'line',
                        'w-0 border-[1.5px] border-dashed bg-transparent':
                          indicator === 'dashed',
                        'my-0.5': nestLabel && indicator === 'dashed',
                      }
                    )}
                    style={
                      {
                        '--color-bg': indicatorColor,
                        '--color-border': indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div
                  className={cn(
                    'flex flex-1 justify-between leading-none',
                    nestLabel ? 'items-end' : 'items-center'
                  )}
                >
                  <div className="grid gap-1.5">
                    {nestLabel && !hideLabel ? (
                      <span className={cn('font-medium', labelClassName)}>
                        {labelFormatter
                          ? labelFormatter(labelStr, payloadArray)
                          : labelStr}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground">
                      {(itemConfig?.label as string) || item.name || item.dataKey}
                    </span>
                  </div>
                  {item.value !== undefined && (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {typeof item.value === 'number'
                        ? item.value.toLocaleString()
                        : item.value}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

// Legend payload item type
interface LegendPayloadItem {
  value?: string;
  dataKey?: string;
  color?: string;
}

// ChartLegend components
const ChartLegend = RechartsLegend;

interface ChartLegendContentProps extends React.ComponentProps<'div'> {
  payload?: LegendPayloadItem[];
  verticalAlign?: 'top' | 'middle' | 'bottom';
  hideIcon?: boolean;
  nameKey?: string;
}

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>(
  (
    { className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey },
    ref
  ) => {
    const { config } = useChart();

    if (!payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-4',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || 'value'}`;
          const itemConfig = config[key] || {};

          return (
            <div
              key={item.value}
              className={cn(
                'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground'
              )}
            >
              {!hideIcon && (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {(itemConfig?.label as string) || item.value}
            </div>
          );
        })}
      </div>
    );
  }
);
ChartLegendContent.displayName = 'ChartLegendContent';

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
