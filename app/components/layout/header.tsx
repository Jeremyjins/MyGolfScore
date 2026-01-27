// Page Header Component
import { cn } from '~/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
}

export function Header({ title, subtitle, leftAction, rightAction, className }: HeaderProps) {
  return (
    <header className={cn('flex items-center justify-between mb-6', className)}>
      <div className="flex items-center gap-2">
        {leftAction}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </header>
  );
}

// 뒤로가기 버튼이 있는 헤더
interface BackHeaderProps {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export function BackHeader({
  title,
  onBack,
  rightAction,
  className,
}: BackHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between h-14 -mx-4 px-4 border-b border-border bg-background sticky top-0 z-40 pt-safe',
        className
      )}
    >
      <button
        onClick={onBack}
        className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-accent transition-colors"
        aria-label="뒤로 가기"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="w-10 flex justify-end">{rightAction}</div>
    </header>
  );
}
