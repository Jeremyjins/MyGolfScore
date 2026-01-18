// Settings Page
import { Link, useFetcher } from 'react-router';
import type { Route } from './+types/_layout.settings';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
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
import { GolfIcon, UsersIcon, LogOutIcon, InfoIcon } from '~/components/ui/icons';

export { loader, action } from '~/loaders/settings.server';

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const { userName, stats } = loaderData;
  const fetcher = useFetcher<typeof import('~/loaders/settings.server').action>();

  const handleLogout = () => {
    fetcher.submit({ intent: 'logout' }, { method: 'POST' });
  };

  return (
    <PageContainer>
      <Header title="설정" />

      {/* 사용자 정보 */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {userName.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{userName}</h2>
              <p className="text-sm text-muted-foreground">골프 스코어 기록</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 요약 */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">나의 기록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.rounds}</p>
              <p className="text-xs text-muted-foreground">라운드</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.courses}</p>
              <p className="text-xs text-muted-foreground">코스</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.companions}</p>
              <p className="text-xs text-muted-foreground">동반자</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메뉴 */}
      <div className="space-y-2 mb-6">
        <Link to="/courses" className="block">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <GolfIcon className="w-5 h-5 text-muted-foreground" />
              <span>코스 관리</span>
            </CardContent>
          </Card>
        </Link>

        <Link to="/companions" className="block">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <UsersIcon className="w-5 h-5 text-muted-foreground" />
              <span>동반자 관리</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 앱 정보 */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-3 py-4">
          <InfoIcon className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium">My Golf Score</p>
            <p className="text-sm text-muted-foreground">버전 1.0.0</p>
          </div>
        </CardContent>
      </Card>

      {/* 로그아웃 */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full gap-2">
            <LogOutIcon className="w-4 h-4" />
            로그아웃
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로그아웃</AlertDialogTitle>
            <AlertDialogDescription>
              정말 로그아웃하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              로그아웃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
