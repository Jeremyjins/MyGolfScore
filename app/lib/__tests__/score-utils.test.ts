import { describe, it, expect } from 'vitest';
import { formatScoreToPar, generateDefaultHoles } from '../score-utils';

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

    it('should format even par as 0', () => {
      expect(formatScoreToPar(0)).toBe('0');
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
