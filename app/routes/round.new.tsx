// Round Start Wizard Page
import { useState, useEffect } from 'react';
import { Link, useNavigate, useFetcher } from 'react-router';
import type { Route } from './+types/round.new';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { CourseCombobox } from '~/components/course/course-combobox';
import { CompanionMultiSelect } from '~/components/companion/companion-multi-select';
import { DatePicker } from '~/components/ui/date-picker';
import { TimePicker } from '~/components/ui/time-picker';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, MapPinIcon, UsersIcon } from '~/components/ui/icons';
import { format } from 'date-fns';
import type { Course, Companion } from '~/types';

export { loader, action } from '~/loaders/round-new.server';

export default function RoundNewPage({ loaderData }: Route.ComponentProps) {
  const { courses, companions } = loaderData as { courses: Course[]; companions: Companion[] };
  const fetcher = useFetcher<{ success?: boolean; roundId?: string; error?: string }>();
  const navigate = useNavigate();

  const [playDate, setPlayDate] = useState<Date>(new Date());
  const [teeTime, setTeeTime] = useState<string>('08:00');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    courses.find((c) => c.is_favorite)?.id || courses[0]?.id || null
  );
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>(
    []
  );

  // 라운드 생성 성공 시 이동
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.roundId) {
      navigate(`/round/${fetcher.data.roundId}`);
    }
  }, [fetcher.data?.success, fetcher.data?.roundId, navigate]);


  const handleSubmit = () => {
    if (!selectedCourseId) return;

    fetcher.submit(
      {
        playDate: format(playDate, 'yyyy-MM-dd'),
        teeTime,
        courseId: selectedCourseId,
        companionIds: JSON.stringify(selectedCompanionIds),
      },
      { method: 'POST' }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">라운드 시작</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* 날짜 & 시간 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">날짜 & 시간</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                날짜
              </label>
              <DatePicker
                value={playDate}
                onChange={(date) => date && setPlayDate(date)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                티오프 시간 (선택)
              </label>
              <TimePicker
                value={teeTime}
                onChange={(time) => setTeeTime(time)}
                placeholder="시간을 선택하세요"
              />
            </div>
          </CardContent>
        </Card>

        {/* 코스 선택 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPinIcon className="w-4 h-4" />
              코스 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">
                  등록된 코스가 없습니다
                </p>
                <Link to="/courses">
                  <Button variant="outline" size="sm">
                    코스 등록하기
                  </Button>
                </Link>
              </div>
            ) : (
              <CourseCombobox
                courses={courses}
                value={selectedCourseId}
                onChange={setSelectedCourseId}
                placeholder="코스를 검색하여 선택하세요"
              />
            )}
          </CardContent>
        </Card>

        {/* 동반자 선택 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                동반자 선택
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {selectedCompanionIds.length}/3
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {companions.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">
                  등록된 동반자가 없습니다
                </p>
                <Link to="/companions">
                  <Button variant="outline" size="sm">
                    동반자 추가하기
                  </Button>
                </Link>
              </div>
            ) : (
              <CompanionMultiSelect
                companions={companions}
                value={selectedCompanionIds}
                onChange={setSelectedCompanionIds}
                maxSelection={3}
                placeholder="동반자를 검색하여 선택하세요"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button
          onClick={handleSubmit}
          disabled={!selectedCourseId || fetcher.state !== 'idle'}
          className="w-full h-12 text-lg"
        >
          라운드 시작
        </Button>
      </div>
    </div>
  );
}
