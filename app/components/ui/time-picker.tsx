// TimePicker component with improved mobile-friendly design
import * as React from 'react';
import { ClockIcon } from 'lucide-react';

import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { ScrollArea } from '~/components/ui/scroll-area';

interface TimePickerProps {
  value?: string; // HH:mm format
  onChange?: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Generate time options
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = ['00', '10', '20', '30', '40', '50'];

export function TimePicker({
  value,
  onChange,
  placeholder = '시간을 선택하세요',
  disabled = false,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedHour, setSelectedHour] = React.useState<string>(
    value?.split(':')[0] || ''
  );
  const [selectedMinute, setSelectedMinute] = React.useState<string>(
    value?.split(':')[1] || ''
  );

  // Sync with external value changes
  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setSelectedHour(h || '');
      setSelectedMinute(m || '');
    } else {
      setSelectedHour('');
      setSelectedMinute('');
    }
  }, [value]);

  const handleHourSelect = (hour: string) => {
    setSelectedHour(hour);
    if (selectedMinute) {
      onChange?.(`${hour}:${selectedMinute}`);
      setOpen(false);
    }
  };

  const handleMinuteSelect = (minute: string) => {
    setSelectedMinute(minute);
    if (selectedHour) {
      onChange?.(`${selectedHour}:${minute}`);
      setOpen(false);
    }
  };

  const formatDisplayTime = () => {
    if (!value) return null;
    const [h, m] = value.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour < 12 ? '오전' : '오후';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${ampm} ${displayHour}시 ${m}분`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <ClockIcon className="mr-2 h-4 w-4" />
          {formatDisplayTime() || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Hour selection */}
          <div className="border-r">
            <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b">
              시
            </div>
            <ScrollArea className="h-56">
              <div className="p-1">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => handleHourSelect(hour)}
                    className={cn(
                      'w-full px-4 py-2 text-sm rounded-md transition-colors text-center',
                      selectedHour === hour
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Minute selection */}
          <div>
            <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b">
              분
            </div>
            <ScrollArea className="h-56">
              <div className="p-1">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => handleMinuteSelect(minute)}
                    className={cn(
                      'w-full px-4 py-2 text-sm rounded-md transition-colors text-center',
                      selectedMinute === minute
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Quick select buttons */}
        <div className="border-t p-2 grid grid-cols-3 gap-1">
          {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00'].map((time) => (
            <button
              key={time}
              onClick={() => {
                const [h, m] = time.split(':');
                setSelectedHour(h);
                setSelectedMinute(m);
                onChange?.(time);
                setOpen(false);
              }}
              className={cn(
                'px-2 py-1.5 text-xs rounded-md transition-colors',
                value === time
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {time}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
