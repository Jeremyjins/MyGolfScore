import { describe, it, expect } from 'vitest';
import {
  formatScoreToPar,
  calculateToPar,
  getScoreColorClass,
  getScoreBgClass,
  calculateOutScore,
  calculateInScore,
  calculateTotalScore,
  calculateHalfPar,
  calculateTotalPar,
  getScoreCategoryName,
  calculateHandicap,
  generateDefaultHoles,
} from '../score-utils';

describe('score-utils', () => {
  describe('formatScoreToPar', () => {
    it('should format positive scores with plus sign', () => {
      expect(formatScoreToPar(5)).toBe('+5');
      expect(formatScoreToPar(1)).toBe('+1');
      expect(formatScoreToPar(10)).toBe('+10');
    });

    it('should format negative scores with minus sign', () => {
      expect(formatScoreToPar(-3)).toBe('-3');
      expect(formatScoreToPar(-1)).toBe('-1');
      expect(formatScoreToPar(-10)).toBe('-10');
    });

    it('should format even par as E', () => {
      expect(formatScoreToPar(0)).toBe('E');
    });
  });

  describe('calculateToPar', () => {
    it('should calculate difference from par', () => {
      expect(calculateToPar(4, 4)).toBe(0);
      expect(calculateToPar(5, 4)).toBe(1);
      expect(calculateToPar(3, 4)).toBe(-1);
      expect(calculateToPar(2, 5)).toBe(-3);
    });
  });

  describe('getScoreColorClass', () => {
    it('should return muted for undefined', () => {
      expect(getScoreColorClass(undefined, 4)).toBe('text-muted-foreground');
    });

    it('should return yellow for eagle or better', () => {
      expect(getScoreColorClass(2, 4)).toContain('yellow');
      expect(getScoreColorClass(3, 5)).toContain('yellow');
    });

    it('should return green for birdie', () => {
      expect(getScoreColorClass(3, 4)).toContain('green');
    });

    it('should return foreground for par', () => {
      expect(getScoreColorClass(4, 4)).toBe('text-foreground');
    });

    it('should return orange for bogey', () => {
      expect(getScoreColorClass(5, 4)).toContain('orange');
    });

    it('should return red for double bogey', () => {
      expect(getScoreColorClass(6, 4)).toContain('red-500');
    });

    it('should return darker red for triple or worse', () => {
      expect(getScoreColorClass(7, 4)).toContain('red-700');
    });
  });

  describe('getScoreBgClass', () => {
    it('should return empty for undefined', () => {
      expect(getScoreBgClass(undefined, 4)).toBe('');
    });

    it('should return yellow bg for eagle', () => {
      expect(getScoreBgClass(2, 4)).toContain('yellow');
    });

    it('should return green bg for birdie', () => {
      expect(getScoreBgClass(3, 4)).toContain('green');
    });

    it('should return empty for par', () => {
      expect(getScoreBgClass(4, 4)).toBe('');
    });
  });

  describe('calculateOutScore', () => {
    it('should sum strokes for holes 1-9', () => {
      const scores = [
        { hole_number: 1, strokes: 4 },
        { hole_number: 2, strokes: 3 },
        { hole_number: 9, strokes: 5 },
        { hole_number: 10, strokes: 10 }, // Should be excluded
      ];
      expect(calculateOutScore(scores)).toBe(12);
    });

    it('should return 0 for empty array', () => {
      expect(calculateOutScore([])).toBe(0);
    });
  });

  describe('calculateInScore', () => {
    it('should sum strokes for holes 10-18', () => {
      const scores = [
        { hole_number: 9, strokes: 10 }, // Should be excluded
        { hole_number: 10, strokes: 4 },
        { hole_number: 18, strokes: 5 },
      ];
      expect(calculateInScore(scores)).toBe(9);
    });

    it('should return 0 for empty array', () => {
      expect(calculateInScore([])).toBe(0);
    });
  });

  describe('calculateTotalScore', () => {
    it('should sum all strokes', () => {
      const scores = [
        { hole_number: 1, strokes: 4 },
        { hole_number: 10, strokes: 5 },
      ];
      expect(calculateTotalScore(scores)).toBe(9);
    });
  });

  describe('calculateHalfPar', () => {
    const holes = [
      { hole: 1, par: 4 },
      { hole: 2, par: 3 },
      { hole: 9, par: 5 },
      { hole: 10, par: 4 },
      { hole: 18, par: 4 },
    ];

    it('should calculate out par (holes 1-9)', () => {
      expect(calculateHalfPar(holes, 'out')).toBe(12);
    });

    it('should calculate in par (holes 10-18)', () => {
      expect(calculateHalfPar(holes, 'in')).toBe(8);
    });
  });

  describe('calculateTotalPar', () => {
    it('should sum all pars', () => {
      const holes = [
        { hole: 1, par: 4 },
        { hole: 2, par: 3 },
        { hole: 3, par: 5 },
      ];
      expect(calculateTotalPar(holes)).toBe(12);
    });
  });

  describe('getScoreCategoryName', () => {
    it('should return Korean names for score categories', () => {
      expect(getScoreCategoryName(1, 4)).toBe('알바트로스');
      expect(getScoreCategoryName(2, 4)).toBe('이글');
      expect(getScoreCategoryName(3, 4)).toBe('버디');
      expect(getScoreCategoryName(4, 4)).toBe('파');
      expect(getScoreCategoryName(5, 4)).toBe('보기');
      expect(getScoreCategoryName(6, 4)).toBe('더블 보기');
      expect(getScoreCategoryName(7, 4)).toBe('트리플 보기');
      expect(getScoreCategoryName(8, 4)).toBe('+4');
    });
  });

  describe('calculateHandicap', () => {
    it('should return 0 for empty array', () => {
      expect(calculateHandicap([])).toBe(0);
    });

    it('should calculate handicap correctly', () => {
      // Average of [10, 20] = 15, * 0.96 = 14.4
      const handicap = calculateHandicap([10, 20]);
      expect(handicap).toBe(14.4);
    });
  });

  describe('generateDefaultHoles', () => {
    it('should generate 18 holes', () => {
      const holes = generateDefaultHoles();
      expect(holes).toHaveLength(18);
    });

    it('should have holes numbered 1-18', () => {
      const holes = generateDefaultHoles();
      expect(holes[0].hole).toBe(1);
      expect(holes[17].hole).toBe(18);
    });

    it('should sum to par 72', () => {
      const holes = generateDefaultHoles();
      const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
      expect(totalPar).toBe(72);
    });

    it('should have valid par values (3, 4, or 5)', () => {
      const holes = generateDefaultHoles();
      holes.forEach((h) => {
        expect([3, 4, 5]).toContain(h.par);
      });
    });
  });
});
