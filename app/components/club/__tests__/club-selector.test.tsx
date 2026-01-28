import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClubSelector } from '../club-selector';
import type { Club } from '~/types';

// Mock useFetcher
const mockSubmit = vi.fn();
vi.mock('react-router', () => ({
  useFetcher: () => ({
    submit: mockSubmit,
    state: 'idle',
    formData: null,
  }),
}));

// Sample clubs data
const mockClubs: Club[] = [
  { id: '1', code: 'DR', name: '드라이버', category: 'DRIVER', sort_order: 1, created_at: '' },
  { id: '2', code: '3W', name: '3번 우드', category: 'WOOD', sort_order: 2, created_at: '' },
  { id: '3', code: '5W', name: '5번 우드', category: 'WOOD', sort_order: 3, created_at: '' },
  { id: '4', code: '5I', name: '5번 아이언', category: 'IRON', sort_order: 10, created_at: '' },
  { id: '5', code: '7I', name: '7번 아이언', category: 'IRON', sort_order: 12, created_at: '' },
  { id: '6', code: 'PT', name: '퍼터', category: 'PUTTER', sort_order: 25, created_at: '' },
];

describe('ClubSelector', () => {
  beforeEach(() => {
    mockSubmit.mockClear();
  });

  describe('rendering', () => {
    it('should render all clubs', () => {
      render(<ClubSelector allClubs={mockClubs} userClubIds={[]} />);

      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('3W')).toBeInTheDocument();
      expect(screen.getByText('5W')).toBeInTheDocument();
      expect(screen.getByText('5I')).toBeInTheDocument();
      expect(screen.getByText('7I')).toBeInTheDocument();
      expect(screen.getByText('PT')).toBeInTheDocument();
    });

    it('should group clubs by category', () => {
      render(<ClubSelector allClubs={mockClubs} userClubIds={[]} />);

      // Check category labels exist
      expect(screen.getByText('드라이버')).toBeInTheDocument();
      expect(screen.getByText('우드')).toBeInTheDocument();
      expect(screen.getByText('아이언')).toBeInTheDocument();
      expect(screen.getByText('퍼터')).toBeInTheDocument();
    });

    it('should show selected clubs with different styling', () => {
      render(<ClubSelector allClubs={mockClubs} userClubIds={['1', '6']} />);

      const drButton = screen.getByText('DR').closest('button');
      const ptButton = screen.getByText('PT').closest('button');

      // Selected clubs should have primary color class
      expect(drButton).toHaveClass('bg-primary');
      expect(ptButton).toHaveClass('bg-primary');
    });

    it('should show unselected clubs with background styling', () => {
      render(<ClubSelector allClubs={mockClubs} userClubIds={['1']} />);

      const woodButton = screen.getByText('3W').closest('button');
      expect(woodButton).toHaveClass('bg-background');
    });
  });

  describe('interactions', () => {
    it('should call submit with add action when clicking unselected club', () => {
      render(<ClubSelector allClubs={mockClubs} userClubIds={[]} />);

      const drButton = screen.getByText('DR').closest('button')!;
      fireEvent.click(drButton);

      expect(mockSubmit).toHaveBeenCalledWith(
        {
          intent: 'toggleClub',
          clubId: '1',
          action: 'add',
        },
        { method: 'POST' }
      );
    });

    it('should call submit with remove action when clicking selected club', () => {
      render(<ClubSelector allClubs={mockClubs} userClubIds={['1']} />);

      const drButton = screen.getByText('DR').closest('button')!;
      fireEvent.click(drButton);

      expect(mockSubmit).toHaveBeenCalledWith(
        {
          intent: 'toggleClub',
          clubId: '1',
          action: 'remove',
        },
        { method: 'POST' }
      );
    });

    it('should toggle multiple clubs independently', () => {
      render(<ClubSelector allClubs={mockClubs} userClubIds={['1']} />);

      // Add 3W
      const woodButton = screen.getByText('3W').closest('button')!;
      fireEvent.click(woodButton);
      expect(mockSubmit).toHaveBeenLastCalledWith(
        expect.objectContaining({ clubId: '2', action: 'add' }),
        expect.any(Object)
      );

      // Remove DR
      const drButton = screen.getByText('DR').closest('button')!;
      fireEvent.click(drButton);
      expect(mockSubmit).toHaveBeenLastCalledWith(
        expect.objectContaining({ clubId: '1', action: 'remove' }),
        expect.any(Object)
      );
    });
  });

  describe('empty state', () => {
    it('should handle empty clubs array', () => {
      const { container } = render(<ClubSelector allClubs={[]} userClubIds={[]} />);
      // Should not crash, renders the container
      expect(container).toBeTruthy();
    });
  });

  describe('category ordering', () => {
    it('should display categories in correct order', () => {
      render(<ClubSelector allClubs={mockClubs} userClubIds={[]} />);

      const categories = screen.getAllByText(/드라이버|우드|아이언|퍼터/);
      const categoryTexts = categories.map(el => el.textContent);

      const driverIndex = categoryTexts.findIndex(t => t === '드라이버');
      const woodIndex = categoryTexts.findIndex(t => t === '우드');
      const ironIndex = categoryTexts.findIndex(t => t === '아이언');
      const putterIndex = categoryTexts.findIndex(t => t === '퍼터');

      expect(driverIndex).toBeLessThan(woodIndex);
      expect(woodIndex).toBeLessThan(ironIndex);
      expect(ironIndex).toBeLessThan(putterIndex);
    });
  });
});
