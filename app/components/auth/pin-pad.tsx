// PIN Pad Component for Login
import { useState, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface PinPadProps {
  onComplete: (pin: string) => void;
  isLoading?: boolean;
  error?: string;
}

const PIN_LENGTH = 4;

export function PinPad({ onComplete, isLoading = false, error }: PinPadProps) {
  const [pin, setPin] = useState('');

  const handleNumberClick = useCallback(
    (num: string) => {
      if (isLoading) return;

      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === PIN_LENGTH) {
        onComplete(newPin);
        // 잠시 후 초기화 (애니메이션 효과)
        setTimeout(() => setPin(''), 300);
      }
    },
    [pin, isLoading, onComplete]
  );

  const handleBackspace = useCallback(() => {
    if (isLoading) return;
    setPin((prev) => prev.slice(0, -1));
  }, [isLoading]);

  const handleClear = useCallback(() => {
    if (isLoading) return;
    setPin('');
  }, [isLoading]);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* PIN 표시 (도트) */}
      <div className="flex gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-all duration-200',
              i < pin.length
                ? 'bg-primary border-primary scale-110'
                : 'border-muted-foreground'
            )}
          />
        ))}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="text-sm text-destructive animate-shake">{error}</p>
      )}

      {/* 숫자 패드 */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <Button
            key={num}
            variant="outline"
            size="lg"
            className="w-16 h-16 text-2xl font-semibold"
            onClick={() => handleNumberClick(num)}
            disabled={isLoading}
          >
            {num}
          </Button>
        ))}

        {/* 하단 행: Clear, 0, Backspace */}
        <Button
          variant="ghost"
          size="lg"
          className="w-16 h-16 text-sm"
          onClick={handleClear}
          disabled={isLoading}
        >
          C
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-16 h-16 text-2xl font-semibold"
          onClick={() => handleNumberClick('0')}
          disabled={isLoading}
        >
          0
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-16 h-16 text-lg"
          onClick={handleBackspace}
          disabled={isLoading}
        >
          ⌫
        </Button>
      </div>

      {/* 로딩 표시 */}
      {isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse">
          확인 중...
        </p>
      )}
    </div>
  );
}
