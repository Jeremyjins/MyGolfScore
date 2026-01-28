// Score calculation utilities
import type { HoleInfo } from '~/types';

// 스코어 표시 텍스트 (Par 모드)
export function formatScoreToPar(toPar: number): string {
  if (toPar === 0) return '0';
  if (toPar > 0) return `+${toPar}`;
  return `${toPar}`;
}

// 기본 18홀 Par 구성 생성
export function generateDefaultHoles(): HoleInfo[] {
  // 일반적인 Par 72 코스: Par 4 x 10, Par 3 x 4, Par 5 x 4
  return [
    { hole: 1, par: 4 },
    { hole: 2, par: 3 },
    { hole: 3, par: 5 },
    { hole: 4, par: 4 },
    { hole: 5, par: 4 },
    { hole: 6, par: 3 },
    { hole: 7, par: 5 },
    { hole: 8, par: 4 },
    { hole: 9, par: 4 },
    { hole: 10, par: 4 },
    { hole: 11, par: 3 },
    { hole: 12, par: 5 },
    { hole: 13, par: 4 },
    { hole: 14, par: 4 },
    { hole: 15, par: 3 },
    { hole: 16, par: 5 },
    { hole: 17, par: 4 },
    { hole: 18, par: 4 },
  ];
}
