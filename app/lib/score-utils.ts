// Score calculation utilities
import type { HoleInfo, PlayerScore } from '~/types';

// Par 대비 스코어 계산
export function calculateToPar(strokes: number, par: number): number {
  return strokes - par;
}

// 스코어 표시 텍스트 (Par 모드)
export function formatScoreToPar(toPar: number): string {
  if (toPar === 0) return '0';
  if (toPar > 0) return `+${toPar}`;
  return `${toPar}`;
}

// 스코어 색상 클래스
export function getScoreColorClass(strokes: number | undefined, par: number): string {
  if (strokes === undefined) return 'text-muted-foreground';

  const diff = strokes - par;

  if (diff <= -2) return 'text-yellow-500 font-bold'; // Eagle or better
  if (diff === -1) return 'text-green-500 font-semibold'; // Birdie
  if (diff === 0) return 'text-foreground'; // Par
  if (diff === 1) return 'text-orange-500'; // Bogey
  if (diff === 2) return 'text-red-500'; // Double bogey
  return 'text-red-700 font-semibold'; // Triple or worse
}

// 스코어 배경 색상 클래스
export function getScoreBgClass(strokes: number | undefined, par: number): string {
  if (strokes === undefined) return '';

  const diff = strokes - par;

  if (diff <= -2) return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (diff === -1) return 'bg-green-100 dark:bg-green-900/30';
  if (diff === 0) return '';
  if (diff === 1) return 'bg-orange-100 dark:bg-orange-900/30';
  if (diff === 2) return 'bg-red-100 dark:bg-red-900/30';
  return 'bg-red-200 dark:bg-red-900/50';
}

// 전반(OUT) 스코어 계산
export function calculateOutScore(
  scores: { hole_number: number; strokes: number }[]
): number {
  return scores
    .filter((s) => s.hole_number >= 1 && s.hole_number <= 9)
    .reduce((sum, s) => sum + s.strokes, 0);
}

// 후반(IN) 스코어 계산
export function calculateInScore(
  scores: { hole_number: number; strokes: number }[]
): number {
  return scores
    .filter((s) => s.hole_number >= 10 && s.hole_number <= 18)
    .reduce((sum, s) => sum + s.strokes, 0);
}

// 총 스코어 계산
export function calculateTotalScore(
  scores: { hole_number: number; strokes: number }[]
): number {
  return scores.reduce((sum, s) => sum + s.strokes, 0);
}

// 전반/후반 Par 계산
export function calculateHalfPar(holes: HoleInfo[], half: 'out' | 'in'): number {
  const range = half === 'out' ? [1, 9] : [10, 18];
  return holes
    .filter((h) => h.hole >= range[0] && h.hole <= range[1])
    .reduce((sum, h) => sum + h.par, 0);
}

// 전체 Par 계산
export function calculateTotalPar(holes: HoleInfo[]): number {
  return holes.reduce((sum, h) => sum + h.par, 0);
}

// 플레이어 스코어 요약 생성
export function buildPlayerScore(
  id: string,
  name: string,
  isUser: boolean,
  scores: { hole_number: number; strokes: number }[],
  holes: HoleInfo[]
): PlayerScore {
  const scoreRecord: Record<number, number> = {};
  scores.forEach((s) => {
    scoreRecord[s.hole_number] = s.strokes;
  });

  const totalScore = calculateTotalScore(scores);
  const totalPar = calculateTotalPar(holes);
  const scoreToPar = scores.length === 18 ? totalScore - totalPar : null;

  return {
    id,
    name,
    isUser,
    scores: scoreRecord,
    totalScore: scores.length > 0 ? totalScore : null,
    scoreToPar,
  };
}

// 스코어 카테고리 이름
export function getScoreCategoryName(strokes: number, par: number): string {
  const diff = strokes - par;

  if (diff <= -3) return '알바트로스';
  if (diff === -2) return '이글';
  if (diff === -1) return '버디';
  if (diff === 0) return '파';
  if (diff === 1) return '보기';
  if (diff === 2) return '더블 보기';
  if (diff === 3) return '트리플 보기';
  return `+${diff}`;
}

// 핸디캡 계산 (간단 버전)
export function calculateHandicap(recentScores: number[]): number {
  if (recentScores.length === 0) return 0;

  // 최근 스코어의 평균에 0.96을 곱함 (간단한 핸디캡 공식)
  const average = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  return Math.round(average * 0.96 * 10) / 10;
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
