// Course Combobox Component - 검색 가능한 코스 선택 콤보박스
import * as React from 'react';
import { Button } from '~/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { CheckIcon, ChevronsUpDownIcon, StarIcon, MapPinIcon } from '~/components/ui/icons';
import { cn } from '~/lib/utils';
import type { Course } from '~/types';

interface CourseComboboxProps {
  courses: Course[];
  value: string | null;
  onChange: (courseId: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export function CourseCombobox({
  courses,
  value,
  onChange,
  placeholder = '코스를 선택하세요',
  emptyMessage = '코스를 찾을 수 없습니다',
}: CourseComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCourse = courses.find((course) => course.id === value);

  // 즐겨찾기 코스를 먼저 정렬
  const sortedCourses = React.useMemo(() => {
    return [...courses].sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return a.name.localeCompare(b.name, 'ko');
    });
  }, [courses]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 text-base"
        >
          <span className="flex items-center gap-2 truncate">
            {selectedCourse ? (
              <>
                {selectedCourse.is_favorite && (
                  <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
                <span className="truncate">{selectedCourse.name}</span>
                <span className="text-muted-foreground text-sm shrink-0">
                  ({selectedCourse.holes.length}홀)
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="코스 검색..." className="h-11" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {sortedCourses.map((course) => (
                <CommandItem
                  key={course.id}
                  value={course.name}
                  onSelect={() => {
                    onChange(course.id === value ? null : course.id);
                    setOpen(false);
                  }}
                  className="py-3"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {course.is_favorite ? (
                      <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                    ) : (
                      <MapPinIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{course.name}</span>
                    <span className="text-muted-foreground text-sm shrink-0">
                      ({course.holes.length}홀)
                    </span>
                  </div>
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4 shrink-0',
                      value === course.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
