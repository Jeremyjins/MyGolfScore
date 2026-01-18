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
import { ArrowLeftIcon, EditIcon, DeleteIcon, UserIcon } from '~/components/ui/icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatScoreToPar } from '~/lib/score-utils';
import type { Companion } from '~/types';

export { loader, action } from '~/loaders/companions-detail.server';

interface RoundHistory {
  id: string;
  play_date: string;
  course_name: string;
  total_score: number | null;
  score_to_par: number | null;
}

interface Stats {
  totalRounds: number;
  averageScore: number;
  bestScore: number | null;
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

      {/* 통계 */}
      {stats.totalRounds > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <span className="text-xs text-muted-foreground">평균 스코어</span>
              <p className="text-2xl font-bold">
                {stats.averageScore > 0 ? Math.round(stats.averageScore) : '-'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <span className="text-xs text-muted-foreground">베스트</span>
              <p className="text-2xl font-bold">
                {stats.bestScore !== null ? formatScoreToPar(stats.bestScore) : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 라운드 기록 */}
      {roundHistory.length > 0 ? (
        <div>
          <h3 className="font-semibold mb-3">함께한 라운드</h3>
          <div className="space-y-2">
            {roundHistory.map((round) => (
              <Link key={round.id} to={`/history/${round.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
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
