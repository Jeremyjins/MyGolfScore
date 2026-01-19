// TimePicker component with native time input for mobile-friendly design
import * as React from 'react';
import { cn } from '~/lib/utils';

interface TimePickerProps {
  value?: string; // HH:mm format
  onChange?: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** 빠른 선택 버튼 표시 여부 (기본: true) */
  showQuickSelect?: boolean;
}

// Quick select time options (common tee-off times in Korea)
const quickSelectTimes = [
  { value: '06:00', label: '6:00' },
  { value: '06:30', label: '6:30' },
  { value: '07:00', label: '7:00' },
  { value: '07:30', label: '7:30' },
  { value: '08:00', label: '8:00' },
  { value: '08:30', label: '8:30' },
  { value: '09:00', label: '9:00' },
  { value: '09:30', label: '9:30' },
  { value: '10:00', label: '10:00' },
  { value: '10:30', label: '10:30' },
  { value: '11:00', label: '11:00' },
  { value: '11:30', label: '11:30' },
];

export function TimePicker({
  value = '',
  onChange,
  placeholder = '시간 선택',
  disabled = false,
  className,
  showQuickSelect = true,
}: TimePickerProps) {
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleQuickSelect = (time: string) => {
    onChange?.(time);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Native time input - best for mobile */}
      <input
        type="time"
        value={value}
        onChange={handleTimeChange}
        disabled={disabled}
        className={cn(
          'flex h-12 w-full rounded-md border border-input bg-background px-4 py-2 text-base ring-offset-background',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Mobile-friendly: larger touch target, better visibility
          '[&::-webkit-calendar-picker-indicator]:w-6 [&::-webkit-calendar-picker-indicator]:h-6',
          '[&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer',
          !value && 'text-muted-foreground'
        )}
      />

      {/* Quick select buttons for common tee-off times */}
      {showQuickSelect && (
        <div className="flex flex-wrap gap-1.5">
          {quickSelectTimes.map((time) => (
            <button
              key={time.value}
              type="button"
              onClick={() => handleQuickSelect(time.value)}
              disabled={disabled}
              className={cn(
                'px-3 py-2 text-sm rounded-md transition-colors min-h-[36px] min-w-[52px]',
                'border border-input',
                value === time.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {time.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
