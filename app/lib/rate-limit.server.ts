// Rate Limiting utilities for login security
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================
export interface RateLimitStatus {
  allowed: boolean;
  status: 'OK' | 'TEMPORARILY_LOCKED' | 'PERMANENTLY_LOCKED';
  lockedUntil?: string;
  remainingSeconds?: number;
  attempts?: number;
  remaining?: number;
}

export interface FailedLoginResult {
  status: 'ATTEMPT_RECORDED' | 'TEMPORARILY_LOCKED' | 'PERMANENTLY_LOCKED';
  attempts?: number;
  remaining?: number;
  lockedUntil?: string;
  lockoutLevel?: number;
  durationSeconds?: number;
}

// ============================================
// Rate Limit Check
// ============================================
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<RateLimitStatus> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    user_id: userId,
  });

  if (error) {
    console.error('Rate limit check error:', error);
    // On error, allow attempt but log warning
    return { allowed: true, status: 'OK' };
  }

  return {
    allowed: data.allowed,
    status: data.status,
    lockedUntil: data.locked_until,
    remainingSeconds: data.remaining_seconds,
    attempts: data.attempts,
    remaining: data.remaining,
  };
}

// ============================================
// Record Failed Login
// ============================================
export async function recordFailedLogin(
  supabase: SupabaseClient,
  userId: string
): Promise<FailedLoginResult> {
  const { data, error } = await supabase.rpc('record_failed_login', {
    user_id: userId,
  });

  if (error) {
    console.error('Record failed login error:', error);
    // On error, return generic response
    return { status: 'ATTEMPT_RECORDED', attempts: 1, remaining: 2 };
  }

  return {
    status: data.status,
    attempts: data.attempts,
    remaining: data.remaining,
    lockedUntil: data.locked_until,
    lockoutLevel: data.lockout_level,
    durationSeconds: data.duration_seconds,
  };
}

// ============================================
// Record Successful Login
// ============================================
export async function recordSuccessfulLogin(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('record_successful_login', {
    user_id: userId,
  });

  if (error) {
    console.error('Record successful login error:', error);
    // Non-critical, just log
  }
}

// ============================================
// Format Lockout Message
// ============================================
export function formatLockoutMessage(
  status: RateLimitStatus | FailedLoginResult
): string {
  if (status.status === 'PERMANENTLY_LOCKED') {
    return '계정이 잠겼습니다. 관리자에게 문의하세요.';
  }

  if (status.status === 'TEMPORARILY_LOCKED') {
    const seconds = 'remainingSeconds' in status
      ? status.remainingSeconds
      : ('durationSeconds' in status ? status.durationSeconds : undefined);

    if (seconds) {
      if (seconds >= 3600) {
        const hours = Math.ceil(seconds / 3600);
        return `${hours}시간 후에 다시 시도해주세요.`;
      } else if (seconds >= 60) {
        const minutes = Math.ceil(seconds / 60);
        return `${minutes}분 후에 다시 시도해주세요.`;
      } else {
        return `${seconds}초 후에 다시 시도해주세요.`;
      }
    }
    return '잠시 후 다시 시도해주세요.';
  }

  if ('remaining' in status && status.remaining !== undefined) {
    return `PIN이 일치하지 않습니다. (${status.remaining}회 남음)`;
  }

  return 'PIN이 일치하지 않습니다.';
}
