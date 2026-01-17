// Courses Management Page
import { useState } from 'react';
import { useFetcher } from 'react-router';
import type { Route } from './+types/_layout.courses';
import { PageContainer } from '~/components/layout/page-container';
import { Header } from '~/components/layout/header';
import { CourseCard } from '~/components/course/course-card';
import { ParInput } from '~/components/course/par-input';
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
import { PlusIcon, GolfIcon } from '~/components/ui/icons';
import { generateDefaultHoles } from '~/lib/score-utils';
import type { Course, HoleInfo } from '~/types';

export { loader, action } from '~/loaders/courses.server';

export default function CoursesPage({ loaderData }: Route.ComponentProps) {
  const { courses } = loaderData;
  const fetcher = useFetcher<typeof import('~/loaders/courses.server').action>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseHoles, setNewCourseHoles] = useState<HoleInfo[]>(
    generateDefaultHoles()
  );

  const handleCreate = () => {
    if (!newCourseName.trim()) return;

    fetcher.submit(
      {
        intent: 'create',
        name: newCourseName,
        holes: JSON.stringify(newCourseHoles),
      },
      { method: 'POST' }
    );

    setIsDialogOpen(false);
    setNewCourseName('');
    setNewCourseHoles(generateDefaultHoles());
  };

  const handleToggleFavorite = (course: Course) => {
    fetcher.submit(
      {
        intent: 'toggleFavorite',
        id: course.id,
        isFavorite: String(course.is_favorite),
      },
      { method: 'POST' }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('이 코스를 삭제하시겠습니까?')) {
      fetcher.submit({ intent: 'delete', id }, { method: 'POST' });
    }
  };

  return (
    <PageContainer>
      <Header
        title="코스 관리"
        subtitle={`${courses.length}개의 코스`}
        rightAction={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusIcon className="w-4 h-4" />
                추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 코스 등록</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="courseName">코스 이름</Label>
                  <Input
                    id="courseName"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="예: 레이크힐스 CC"
                  />
                </div>

                <div className="space-y-2">
                  <Label>홀별 Par 설정</Label>
                  <ParInput holes={newCourseHoles} onChange={setNewCourseHoles} />
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={!newCourseName.trim() || fetcher.state !== 'idle'}
                  className="w-full"
                >
                  코스 등록
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <GolfIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">등록된 코스가 없습니다</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            첫 코스 등록하기
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onFavoriteToggle={() => handleToggleFavorite(course)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
