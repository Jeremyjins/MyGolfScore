// Error handling utilities
import type { ErrorCode } from '~/types';

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public status: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  AUTH_REQUIRED: 'auth_required',
  INVALID_PIN: 'invalid_pin',
  NOT_FOUND: 'not_found',
  DUPLICATE: 'duplicate',
  VALIDATION: 'validation',
  OFFLINE: 'offline',
  SYNC_FAILED: 'sync_failed',
  INTERNAL: 'internal',
} as const;

export const ErrorMessages: Record<ErrorCode, string> = {
  auth_required: '로그인이 필요합니다.',
  invalid_pin: 'PIN이 올바르지 않습니다.',
  not_found: '데이터를 찾을 수 없습니다.',
  duplicate: '이미 존재하는 데이터입니다.',
  validation: '입력값이 올바르지 않습니다.',
  offline: '오프라인 상태입니다.',
  sync_failed: '동기화에 실패했습니다.',
  internal: '서버 오류가 발생했습니다.',
};

// Supabase 에러를 AppError로 변환
export function handleSupabaseError(error: { code?: string; message?: string }): never {
  if (error.code === '23505') {
    throw new AppError(ErrorMessages.duplicate, ErrorCodes.DUPLICATE);
  }
  if (error.code === '23503') {
    throw new AppError(ErrorMessages.not_found, ErrorCodes.NOT_FOUND, 404);
  }
  if (error.code === 'PGRST116') {
    throw new AppError(ErrorMessages.not_found, ErrorCodes.NOT_FOUND, 404);
  }

  throw new AppError(
    error.message || ErrorMessages.internal,
    ErrorCodes.INTERNAL,
    500
  );
}

// Action 응답 헬퍼
export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return { error: error.message, code: error.code };
  }

  console.error('Unexpected error:', error);
  return { error: ErrorMessages.internal, code: ErrorCodes.INTERNAL };
}

export function successResponse<T>(data: T) {
  return { success: true, data };
}
