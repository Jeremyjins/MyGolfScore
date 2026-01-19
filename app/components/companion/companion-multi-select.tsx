// Companion MultiSelect Component - 검색 가능한 동반자 다중 선택 컴포넌트
import * as React from 'react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
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
import { CheckIcon, ChevronsUpDownIcon, StarIcon, UserIcon, XIcon } from '~/components/ui/icons';
import { cn } from '~/lib/utils';
import type { Companion } from '~/types';

interface CompanionMultiSelectProps {
  companions: Companion[];
  value: string[];
  onChange: (companionIds: string[]) => void;
  maxSelection?: number;
  placeholder?: string;
  emptyMessage?: string;
}

export function CompanionMultiSelect({
  companions,
  value,
  onChange,
  maxSelection = 3,
  placeholder = '동반자를 선택하세요',
  emptyMessage = '동반자를 찾을 수 없습니다',
}: CompanionMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCompanions = companions.filter((companion) =>
    value.includes(companion.id)
  );

  // 즐겨찾기 동반자를 먼저 정렬
  const sortedCompanions = React.useMemo(() => {
    return [...companions].sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return a.name.localeCompare(b.name, 'ko');
    });
  }, [companions]);

  const handleSelect = (companionId: string) => {
    if (value.includes(companionId)) {
      // 이미 선택된 경우 제거
      onChange(value.filter((id) => id !== companionId));
    } else if (value.length < maxSelection) {
      // 최대 선택 수 이하일 때만 추가
      onChange([...value, companionId]);
    }
  };

  const handleRemove = (companionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((id) => id !== companionId));
  };

  const getDisplayName = (companion: Companion) => {
    return companion.nickname || companion.name;
  };

  return (
    <div className="space-y-3">
      {/* 선택된 동반자 표시 */}
      {selectedCompanions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCompanions.map((companion) => (
            <Badge
              key={companion.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1 py-1.5 text-sm"
            >
              {companion.is_favorite && (
                <StarIcon className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              )}
              <span>{getDisplayName(companion)}</span>
              <button
                type="button"
                onClick={(e) => handleRemove(companion.id, e)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 동반자 선택 버튼 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 text-base"
            disabled={value.length >= maxSelection && companions.length > 0}
          >
            <span className="text-muted-foreground">
              {value.length >= maxSelection
                ? `최대 ${maxSelection}명까지 선택 가능`
                : placeholder}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="동반자 검색..." className="h-11" />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {sortedCompanions.map((companion) => {
                  const isSelected = value.includes(companion.id);
                  const isDisabled = !isSelected && value.length >= maxSelection;

                  return (
                    <CommandItem
                      key={companion.id}
                      value={`${companion.name} ${companion.nickname || ''}`}
                      onSelect={() => !isDisabled && handleSelect(companion.id)}
                      disabled={isDisabled}
                      className={cn(
                        'py-3',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {companion.is_favorite ? (
                          <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{companion.name}</span>
                        {companion.nickname && (
                          <span className="text-muted-foreground text-sm shrink-0">
                            ({companion.nickname})
                          </span>
                        )}
                      </div>
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
