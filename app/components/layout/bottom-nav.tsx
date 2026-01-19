// Bottom Navigation Component
import { NavLink } from 'react-router';
import { cn } from '~/lib/utils';
import {
  HomeIcon,
  CalendarCheckIcon,
  GolfIcon,
  UsersIcon,
  SettingsIcon,
} from '~/components/ui/icons';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/home', icon: HomeIcon, label: '홈' },
  { to: '/history', icon: CalendarCheckIcon, label: '기록' },
  { to: '/round/new', icon: GolfIcon, label: '시작' },
  { to: '/companions', icon: UsersIcon, label: '동반자' },
  { to: '/settings', icon: SettingsIcon, label: '설정' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* 활성 탭 상단 인디케이터 */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <item.icon
                  className={cn(
                    'w-5 h-5 transition-transform',
                    isActive && 'scale-110'
                  )}
                />
                <span className="text-xs font-medium">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
