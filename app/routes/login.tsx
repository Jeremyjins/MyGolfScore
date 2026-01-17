// Login page with PIN pad
import { useState } from 'react';
import { useFetcher } from 'react-router';
import type { Route } from './+types/login';
import { PinPad } from '~/components/auth/pin-pad';
import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';
import { GolfIcon } from '~/components/ui/icons';

export { loader, action } from '~/loaders/login.server';

export default function LoginPage({ actionData }: Route.ComponentProps) {
  const fetcher = useFetcher<typeof import('~/loaders/login.server').action>();
  const [rememberMe, setRememberMe] = useState(true);

  const isLoading = fetcher.state !== 'idle';
  const error = fetcher.data?.error || actionData?.error;

  const handlePinComplete = (pin: string) => {
    fetcher.submit(
      { pin, rememberMe: String(rememberMe) },
      { method: 'POST' }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* 로고 */}
      <div className="flex flex-col items-center mb-12">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <GolfIcon className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">My Golf Score</h1>
        <p className="text-muted-foreground mt-1">PIN을 입력하세요</p>
      </div>

      {/* PIN 패드 */}
      <PinPad
        onComplete={handlePinComplete}
        isLoading={isLoading}
        error={error}
      />

      {/* 자동 로그인 옵션 */}
      <div className="flex items-center gap-2 mt-8">
        <Checkbox
          id="rememberMe"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
          disabled={isLoading}
        />
        <Label
          htmlFor="rememberMe"
          className="text-sm text-muted-foreground cursor-pointer"
        >
          자동 로그인 (30일)
        </Label>
      </div>
    </div>
  );
}
