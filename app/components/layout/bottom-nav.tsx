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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* 중앙 시작 버튼은 특별 스타일 */}
                {item.to === '/round/new' ? (
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-full -mt-6 shadow-lg transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/90 text-primary-foreground hover:bg-primary'
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>
                ) : (
                  <item.icon
                    className={cn(
                      'w-5 h-5 transition-transform',
                      isActive && 'scale-110'
                    )}
                  />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    item.to === '/round/new' && '-mt-1'
                  )}
                >
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
