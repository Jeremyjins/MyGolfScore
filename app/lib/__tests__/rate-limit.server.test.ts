import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatLockoutMessage,
  type RateLimitStatus,
  type FailedLoginResult,
} from '../rate-limit.server';

describe('rate-limit.server', () => {
  describe('formatLockoutMessage', () => {
    describe('Permanently Locked', () => {
      it('should return Korean message for permanent lock', () => {
        const status: RateLimitStatus = {
          allowed: false,
          status: 'PERMANENTLY_LOCKED',
        };

        const message = formatLockoutMessage(status);
        expect(message).toBe('계정이 잠겼습니다. 관리자에게 문의하세요.');
      });

      it('should return same message for FailedLoginResult', () => {
        const result: FailedLoginResult = {
          status: 'PERMANENTLY_LOCKED',
        };

        const message = formatLockoutMessage(result);
        expect(message).toBe('계정이 잠겼습니다. 관리자에게 문의하세요.');
      });
    });

    describe('Temporarily Locked', () => {
      it('should format hours correctly', () => {
        const status: RateLimitStatus = {
          allowed: false,
          status: 'TEMPORARILY_LOCKED',
          remainingSeconds: 7200, // 2 hours
        };

        const message = formatLockoutMessage(status);
        expect(message).toBe('2시간 후에 다시 시도해주세요.');
      });

      it('should format minutes correctly', () => {
        const status: RateLimitStatus = {
          allowed: false,
          status: 'TEMPORARILY_LOCKED',
          remainingSeconds: 600, // 10 minutes
        };

        const message = formatLockoutMessage(status);
        expect(message).toBe('10분 후에 다시 시도해주세요.');
      });

      it('should format seconds correctly', () => {
        const status: RateLimitStatus = {
          allowed: false,
          status: 'TEMPORARILY_LOCKED',
          remainingSeconds: 45,
        };

        const message = formatLockoutMessage(status);
        expect(message).toBe('45초 후에 다시 시도해주세요.');
      });

      it('should use durationSeconds from FailedLoginResult', () => {
        const result: FailedLoginResult = {
          status: 'TEMPORARILY_LOCKED',
          durationSeconds: 3600, // 1 hour
        };

        const message = formatLockoutMessage(result);
        expect(message).toBe('1시간 후에 다시 시도해주세요.');
      });

      it('should return generic message when no time provided', () => {
        const status: RateLimitStatus = {
          allowed: false,
          status: 'TEMPORARILY_LOCKED',
        };

        const message = formatLockoutMessage(status);
        expect(message).toBe('잠시 후 다시 시도해주세요.');
      });
    });

    describe('Attempt Recorded', () => {
      it('should show remaining attempts', () => {
        const result: FailedLoginResult = {
          status: 'ATTEMPT_RECORDED',
          attempts: 1,
          remaining: 2,
        };

        const message = formatLockoutMessage(result);
        expect(message).toBe('PIN이 일치하지 않습니다. (2회 남음)');
      });

      it('should show 1 remaining attempt', () => {
        const result: FailedLoginResult = {
          status: 'ATTEMPT_RECORDED',
          attempts: 2,
          remaining: 1,
        };

        const message = formatLockoutMessage(result);
        expect(message).toBe('PIN이 일치하지 않습니다. (1회 남음)');
      });

      it('should show generic message when remaining not provided', () => {
        const result: FailedLoginResult = {
          status: 'ATTEMPT_RECORDED',
          attempts: 1,
        };

        const message = formatLockoutMessage(result);
        expect(message).toBe('PIN이 일치하지 않습니다.');
      });
    });

    describe('OK Status', () => {
      it('should return generic PIN error for OK status with remaining', () => {
        const status: RateLimitStatus = {
          allowed: true,
          status: 'OK',
          attempts: 0,
          remaining: 3,
        };

        const message = formatLockoutMessage(status);
        expect(message).toBe('PIN이 일치하지 않습니다. (3회 남음)');
      });
    });
  });

  describe('Lockout Duration Calculations', () => {
    it('should ceil to next hour for hour lockouts', () => {
      const status: RateLimitStatus = {
        allowed: false,
        status: 'TEMPORARILY_LOCKED',
        remainingSeconds: 3601, // Just over 1 hour
      };

      const message = formatLockoutMessage(status);
      expect(message).toBe('2시간 후에 다시 시도해주세요.');
    });

    it('should ceil to next minute for minute lockouts', () => {
      const status: RateLimitStatus = {
        allowed: false,
        status: 'TEMPORARILY_LOCKED',
        remainingSeconds: 61, // Just over 1 minute
      };

      const message = formatLockoutMessage(status);
      expect(message).toBe('2분 후에 다시 시도해주세요.');
    });
  });
});
