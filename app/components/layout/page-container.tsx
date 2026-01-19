// Page Container with consistent padding and spacing
import { cn } from '~/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  noBottomPadding?: boolean;
}

export function PageContainer({
  children,
  className,
  noPadding = false,
  noBottomPadding = false,
}: PageContainerProps) {
  return (
    <main
      className={cn(
        'min-h-screen',
        !noPadding && 'px-4 pt-safe-4', // iOS safe area + 기본 패딩
        noPadding && 'pt-safe', // 패딩 없을 때도 safe area 적용
        !noBottomPadding && 'pb-20', // Bottom nav 높이 + 여유 (nav 자체가 safe area 처리)
        className
      )}
    >
      <div className="max-w-lg mx-auto">{children}</div>
    </main>
  );
}
