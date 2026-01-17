// Main layout with Bottom Navigation
import { Outlet } from 'react-router';
import type { Route } from './+types/_layout';
import { BottomNav } from '~/components/layout/bottom-nav';

export { loader } from '~/loaders/layout.server';

export default function MainLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* 페이지 컨텐츠 */}
      <Outlet context={{ user: loaderData.user }} />

      {/* 하단 네비게이션 */}
      <BottomNav />
    </div>
  );
}
