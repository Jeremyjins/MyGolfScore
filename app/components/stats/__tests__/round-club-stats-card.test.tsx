import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoundClubStatsCard } from '../round-club-stats-card';
import type { RoundClubStats } from '~/types';

describe('RoundClubStatsCard', () => {
  const createMockStats = (overrides: Partial<RoundClubStats> = {}): RoundClubStats => ({
    totalPutts: 32,
    puttDistribution: [
      { putts: 0, count: 1 },
      { putts: 1, count: 4 },
      { putts: 2, count: 10 },
      { putts: 3, count: 3 },
      { putts: 4, count: 0 },
    ],
    clubUsage: [
      { code: 'DR', count: 14 },
      { code: '7I', count: 8 },
      { code: 'W54', count: 12 },
      { code: 'PT', count: 32 },
    ],
    ...overrides,
  });

  describe('rendering', () => {
    it('should render component with stats', () => {
      const stats = createMockStats();
      render(<RoundClubStatsCard stats={stats} />);

      expect(screen.getByText('라운드 통계')).toBeInTheDocument();
    });

    it('should display total putts', () => {
      const stats = createMockStats({ totalPutts: 30 });
      render(<RoundClubStatsCard stats={stats} />);

      expect(screen.getByText('30퍼트')).toBeInTheDocument();
    });

    it('should display putt distribution labels', () => {
      const stats = createMockStats();
      render(<RoundClubStatsCard stats={stats} />);

      expect(screen.getByText('0퍼트:')).toBeInTheDocument();
      expect(screen.getByText('1퍼트:')).toBeInTheDocument();
      expect(screen.getByText('2퍼트:')).toBeInTheDocument();
      expect(screen.getByText('3퍼트:')).toBeInTheDocument();
    });

    it('should display hole counts for putt distribution', () => {
      const stats = createMockStats();
      render(<RoundClubStatsCard stats={stats} />);

      expect(screen.getByText('1홀')).toBeInTheDocument(); // 0퍼트
      expect(screen.getByText('4홀')).toBeInTheDocument(); // 1퍼트
      expect(screen.getByText('10홀')).toBeInTheDocument(); // 2퍼트
      expect(screen.getByText('3홀')).toBeInTheDocument(); // 3퍼트
    });

    it('should display 4+ for 4 or more putts', () => {
      const stats = createMockStats({
        puttDistribution: [
          { putts: 4, count: 2 },
        ],
      });
      render(<RoundClubStatsCard stats={stats} />);

      expect(screen.getByText('4+퍼트:')).toBeInTheDocument();
    });

    it('should display club usage', () => {
      const stats = createMockStats();
      render(<RoundClubStatsCard stats={stats} />);

      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('7I')).toBeInTheDocument();
      expect(screen.getByText('W54')).toBeInTheDocument();
      expect(screen.getByText('PT')).toBeInTheDocument();
    });

    it('should display club usage counts', () => {
      const stats = createMockStats();
      render(<RoundClubStatsCard stats={stats} />);

      expect(screen.getByText('(14)')).toBeInTheDocument(); // DR
      expect(screen.getByText('(8)')).toBeInTheDocument(); // 7I
      expect(screen.getByText('(12)')).toBeInTheDocument(); // W54
      expect(screen.getByText('(32)')).toBeInTheDocument(); // PT
    });

    it('should display club usage section heading', () => {
      const stats = createMockStats();
      render(<RoundClubStatsCard stats={stats} />);

      expect(screen.getByText('클럽 사용')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should return null when clubUsage is empty', () => {
      const stats = createMockStats({ clubUsage: [] });
      const { container } = render(<RoundClubStatsCard stats={stats} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when clubUsage is undefined', () => {
      const stats = createMockStats({ clubUsage: undefined as unknown as RoundClubStats['clubUsage'] });
      const { container } = render(<RoundClubStatsCard stats={stats} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('putt distribution edge cases', () => {
    it('should handle empty putt distribution', () => {
      const stats = createMockStats({ puttDistribution: [] });
      render(<RoundClubStatsCard stats={stats} />);

      // Should still render the card
      expect(screen.getByText('라운드 통계')).toBeInTheDocument();
      // But putt distribution section should not show
      expect(screen.queryByText('퍼팅 분포')).not.toBeInTheDocument();
    });

    it('should handle null putt distribution', () => {
      const stats = createMockStats({ puttDistribution: null as unknown as RoundClubStats['puttDistribution'] });
      render(<RoundClubStatsCard stats={stats} />);

      // Should still render the card
      expect(screen.getByText('라운드 통계')).toBeInTheDocument();
    });
  });

  describe('multiple clubs', () => {
    it('should display all clubs in usage list', () => {
      const stats = createMockStats({
        clubUsage: [
          { code: 'DR', count: 12 },
          { code: '3W', count: 5 },
          { code: '5I', count: 8 },
          { code: '7I', count: 10 },
          { code: 'W52', count: 6 },
          { code: 'W56', count: 8 },
          { code: 'PT', count: 30 },
        ],
      });
      render(<RoundClubStatsCard stats={stats} />);

      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('3W')).toBeInTheDocument();
      expect(screen.getByText('5I')).toBeInTheDocument();
      expect(screen.getByText('7I')).toBeInTheDocument();
      expect(screen.getByText('W52')).toBeInTheDocument();
      expect(screen.getByText('W56')).toBeInTheDocument();
      expect(screen.getByText('PT')).toBeInTheDocument();
    });
  });
});
