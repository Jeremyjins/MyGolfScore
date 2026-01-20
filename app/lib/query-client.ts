// TanStack Query Client Configuration
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 기본 stale time: 5분
        staleTime: 5 * 60 * 1000,
        // 기본 cache time: 30분
        gcTime: 30 * 60 * 1000,
        // 네트워크 재연결시 자동 refetch
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // 실패시 재시도 횟수
        retry: 1,
      },
      mutations: {
        // mutation 실패시 재시도 없음
        retry: 0,
      },
    },
  });
}

// 싱글톤 클라이언트 (브라우저 환경에서만)
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // 서버에서는 항상 새 클라이언트 생성
    return createQueryClient();
  }
  // 브라우저에서는 싱글톤 사용
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}
