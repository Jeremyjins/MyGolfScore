import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClubStatsSection } from '../club-stats-section';
import type { UserClubStats } from '~/types';

describe('ClubStatsSection', () => {
  const createMockStats = (overrides: Partial<UserClubStats> = {}): UserClubStats => ({
    totalRounds: 10,
    averagePutts: 31.5,
    puttDistribution: [
      { putts: 0, count: 5, percentage: 3 },
      { putts: 1, count: 40, percentage: 22 },
      { putts: 2, count: 100, percentage: 56 },
      { putts: 3, count: 25, percentage: 14 },
      { putts: 4, count: 10, percentage: 5 },
    ],
    clubUsageAverage: [
      { code: 'DR', name: '드라이버', averageUsage: 13.2 },
      { code: '7I', name: '7번 아이언', averageUsage: 8.5 },
      { code: 'PT', name: '퍼터', averageUsage: 31.5 },
    ],
    ...overrides,
  });

  describe('rendering', () => {
    it('should render component with stats', () => {
      const stats = createMockStats();
      render(<ClubStatsSection stats={stats} />);

      expect(screen.getByText(/클럽 통계/)).toBeInTheDocument();
      expect(screen.getByText(/10 라운드/)).toBeInTheDocument();
    });

    it('should display average putts', () => {
      const stats = createMockStats({ averagePutts: 32 });
      render(<ClubStatsSection stats={stats} />);

      expect(screen.getByText('32퍼트/라운드')).toBeInTheDocument();
    });

    it('should display putt distribution labels', () => {
      const stats = createMockStats();
      render(<ClubStatsSection stats={stats} />);

      expect(screen.getByText('0퍼트')).toBeInTheDocument();
      expect(screen.getByText('1퍼트')).toBeInTheDocument();
      expect(screen.getByText('2퍼트')).toBeInTheDocument();
      expect(screen.getByText('3퍼트')).toBeInTheDocument();
      expect(screen.getByText('4퍼트+')).toBeInTheDocument();
    });

    it('should display putt percentages', () => {
      const stats = createMockStats();
      render(<ClubStatsSection stats={stats} />);

      expect(screen.getByText('56%')).toBeInTheDocument(); // 2퍼트 percentage
      expect(screen.getByText('22%')).toBeInTheDocument(); // 1퍼트 percentage
    });

    it('should display club usage average table', () => {
      const stats = createMockStats();
      render(<ClubStatsSection stats={stats} />);

      expect(screen.getByText('18홀 평균 사용회수')).toBeInTheDocument();
      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('7I')).toBeInTheDocument();
      expect(screen.getByText('PT')).toBeInTheDocument();
    });

    it('should display average usage values', () => {
      const stats = createMockStats();
      render(<ClubStatsSection stats={stats} />);

      expect(screen.getByText('13.2')).toBeInTheDocument();
      expect(screen.getByText('8.5')).toBeInTheDocument();
      expect(screen.getByText('31.5')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should return null when totalRounds is 0', () => {
      const stats = createMockStats({ totalRounds: 0 });
      const { container } = render(<ClubStatsSection stats={stats} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when clubUsageAverage is empty', () => {
      const stats = createMockStats({ clubUsageAverage: [] });
      const { container } = render(<ClubStatsSection stats={stats} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when clubUsageAverage is undefined', () => {
      const stats = createMockStats({ clubUsageAverage: undefined as unknown as UserClubStats['clubUsageAverage'] });
      const { container } = render(<ClubStatsSection stats={stats} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('putt distribution bar width', () => {
    it('should handle zero percentages with dash', () => {
      const stats = createMockStats({
        puttDistribution: [
          { putts: 0, count: 0, percentage: 0 },
          { putts: 1, count: 10, percentage: 50 },
          { putts: 2, count: 10, percentage: 50 },
          { putts: 3, count: 0, percentage: 0 },
          { putts: 4, count: 0, percentage: 0 },
        ],
      });

      render(<ClubStatsSection stats={stats} />);

      // Should show dashes for zero percentages
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBe(3); // 0, 3, 4 퍼트
    });
  });

  describe('null average putts', () => {
    it('should not render average putts section when null', () => {
      const stats = createMockStats({ averagePutts: null });
      render(<ClubStatsSection stats={stats} />);

      expect(screen.queryByText(/퍼트\/라운드/)).not.toBeInTheDocument();
    });
  });

  describe('putt distribution section', () => {
    it('should render putt distribution section heading', () => {
      const stats = createMockStats();
      render(<ClubStatsSection stats={stats} />);

      expect(screen.getByText('퍼팅 분포')).toBeInTheDocument();
    });

    it('should not render putt distribution when empty', () => {
      const stats = createMockStats({ puttDistribution: [] });
      render(<ClubStatsSection stats={stats} />);

      expect(screen.queryByText('퍼팅 분포')).not.toBeInTheDocument();
    });
  });
});
