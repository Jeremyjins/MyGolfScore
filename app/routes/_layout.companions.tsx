// Companions Management Page
import { useState } from 'react';
import { useFetcher } from 'react-router';
import type { Route } from './+types/_layout.companions';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { CompanionCard } from '~/components/companion/companion-card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { PlusIcon, UsersIcon } from '~/components/ui/icons';
import type { CompanionWithStats } from '~/types';

export { loader, action } from '~/loaders/companions.server';

export default function CompanionsPage({ loaderData }: Route.ComponentProps) {
  const companions = loaderData.companions as CompanionWithStats[];
  const fetcher = useFetcher<typeof import('~/loaders/companions.server').action>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCompanionName, setNewCompanionName] = useState('');

  const handleCreate = () => {
    if (!newCompanionName.trim()) return;

    fetcher.submit(
      {
        intent: 'create',
        name: newCompanionName,
      },
      { method: 'POST' }
    );

    setIsDialogOpen(false);
    setNewCompanionName('');
  };

  return (
    <PageContainer>
      <Header
        title="동반자 관리"
        subtitle={`${companions.length}명의 동반자`}
        rightAction={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusIcon className="w-4 h-4" />
                추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>동반자 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="companionName">이름</Label>
                  <Input
                    id="companionName"
                    value={newCompanionName}
                    onChange={(e) => setNewCompanionName(e.target.value)}
                    placeholder="예: 홍길동"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
                  />
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={!newCompanionName.trim() || fetcher.state !== 'idle'}
                  className="w-full"
                >
                  동반자 추가
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {companions.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">등록된 동반자가 없습니다</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            첫 동반자 추가하기
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {companions.map((companion) => (
            <CompanionCard
              key={companion.id}
              companion={companion}
              showStats
              roundCount={companion.round_count}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
