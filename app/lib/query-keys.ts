// TanStack Query Keys
// 캐시 키를 체계적으로 관리하기 위한 팩토리 패턴

export const queryKeys = {
  // 사용자 관련
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    stats: () => [...queryKeys.user.all, 'stats'] as const,
  },

  // 라운드 관련
  rounds: {
    all: ['rounds'] as const,
    lists: () => [...queryKeys.rounds.all, 'list'] as const,
    list: (filters?: { status?: string; limit?: number }) =>
      [...queryKeys.rounds.lists(), filters] as const,
    details: () => [...queryKeys.rounds.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.rounds.details(), id] as const,
    recent: (limit: number = 10) =>
      [...queryKeys.rounds.all, 'recent', limit] as const,
  },

  // 코스 관련
  courses: {
    all: ['courses'] as const,
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters?: { favorite?: boolean }) =>
      [...queryKeys.courses.lists(), filters] as const,
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
  },

  // 동반자 관련
  companions: {
    all: ['companions'] as const,
    lists: () => [...queryKeys.companions.all, 'list'] as const,
    list: (filters?: { withStats?: boolean }) =>
      [...queryKeys.companions.lists(), filters] as const,
    details: () => [...queryKeys.companions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companions.details(), id] as const,
  },

  // 통계 관련
  stats: {
    all: ['stats'] as const,
    user: () => [...queryKeys.stats.all, 'user'] as const,
    companion: (id: string) => [...queryKeys.stats.all, 'companion', id] as const,
  },
} as const;

// 캐시 무효화 헬퍼
export const invalidateKeys = {
  // 라운드 생성/수정/삭제 후
  onRoundMutation: () => [
    queryKeys.rounds.all,
    queryKeys.user.stats(),
    queryKeys.stats.user(),
  ],

  // 코스 생성/수정/삭제 후
  onCourseMutation: () => [queryKeys.courses.all],

  // 동반자 생성/수정/삭제 후
  onCompanionMutation: () => [queryKeys.companions.all],

  // 스코어 업데이트 후
  onScoreUpdate: (roundId: string) => [
    queryKeys.rounds.detail(roundId),
    queryKeys.user.stats(),
    queryKeys.stats.user(),
  ],
};
