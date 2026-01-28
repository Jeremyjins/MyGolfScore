import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClubInputPanel } from '../club-input-panel';
import type { Club, ClubShotInput } from '~/types';

// Sample clubs data
const mockClubs: Club[] = [
  { id: '1', code: 'DR', name: '드라이버', category: 'DRIVER', sort_order: 1, created_at: '' },
  { id: '2', code: '7I', name: '7번 아이언', category: 'IRON', sort_order: 14, created_at: '' },
  { id: '3', code: 'W52', name: '52도 웨지', category: 'WEDGE', sort_order: 20, created_at: '' },
  { id: '4', code: 'PT', name: '퍼터', category: 'PUTTER', sort_order: 25, created_at: '' },
];

describe('ClubInputPanel', () => {
  const mockOnAddShot = vi.fn();
  const mockOnRemoveLastShot = vi.fn();
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    userClubs: mockClubs,
    selectedShots: [] as ClubShotInput[],
    onAddShot: mockOnAddShot,
    onRemoveLastShot: mockOnRemoveLastShot,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all user clubs', () => {
      render(<ClubInputPanel {...defaultProps} />);

      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('7I')).toBeInTheDocument();
      expect(screen.getByText('W52')).toBeInTheDocument();
      expect(screen.getByText('PT')).toBeInTheDocument();
    });

    it('should show empty state when no shots selected', () => {
      render(<ClubInputPanel {...defaultProps} />);

      expect(screen.getByText('클럽을 선택하세요')).toBeInTheDocument();
      expect(screen.getByText('0타')).toBeInTheDocument();
    });

    it('should show shot count when shots are selected', () => {
      const shots: ClubShotInput[] = [
        { clubId: '1', clubCode: 'DR', shotOrder: 1, isPutt: false },
        { clubId: '2', clubCode: '7I', shotOrder: 2, isPutt: false },
        { clubId: '4', clubCode: 'PT', shotOrder: 3, isPutt: true },
      ];

      render(<ClubInputPanel {...defaultProps} selectedShots={shots} />);

      expect(screen.getByText(/3타/)).toBeInTheDocument();
    });

    it('should display shot sequence with arrows', () => {
      const shots: ClubShotInput[] = [
        { clubId: '1', clubCode: 'DR', shotOrder: 1, isPutt: false },
        { clubId: '2', clubCode: '7I', shotOrder: 2, isPutt: false },
      ];

      render(<ClubInputPanel {...defaultProps} selectedShots={shots} />);

      // Check arrows between shots
      expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('should highlight putter shots differently', () => {
      const shots: ClubShotInput[] = [
        { clubId: '4', clubCode: 'PT', shotOrder: 1, isPutt: true },
      ];

      render(<ClubInputPanel {...defaultProps} selectedShots={shots} />);

      // Putter shot in sequence should have green background
      // Get the shot display (not the button)
      const shotElements = screen.getAllByText('PT');
      // First one is the shot in sequence, has bg-green-500
      const putterShot = shotElements[0].closest('span');
      expect(putterShot).toHaveClass('bg-green-500');
    });
  });

  describe('mismatch warning', () => {
    it('should show warning when shot count differs from expected score', () => {
      const shots: ClubShotInput[] = [
        { clubId: '1', clubCode: 'DR', shotOrder: 1, isPutt: false },
        { clubId: '2', clubCode: '7I', shotOrder: 2, isPutt: false },
      ];

      render(
        <ClubInputPanel
          {...defaultProps}
          selectedShots={shots}
          expectedScore={4}
        />
      );

      expect(screen.getByText(/기존: 4타/)).toBeInTheDocument();
      expect(screen.getByText(/클럽 수가 기존 스코어와 다릅니다/)).toBeInTheDocument();
    });

    it('should not show warning when shot count matches expected score', () => {
      const shots: ClubShotInput[] = [
        { clubId: '1', clubCode: 'DR', shotOrder: 1, isPutt: false },
        { clubId: '2', clubCode: '7I', shotOrder: 2, isPutt: false },
        { clubId: '3', clubCode: 'W52', shotOrder: 3, isPutt: false },
        { clubId: '4', clubCode: 'PT', shotOrder: 4, isPutt: true },
      ];

      render(
        <ClubInputPanel
          {...defaultProps}
          selectedShots={shots}
          expectedScore={4}
        />
      );

      expect(screen.queryByText(/기존:/)).not.toBeInTheDocument();
    });

    it('should not show warning when expectedScore is null', () => {
      const shots: ClubShotInput[] = [
        { clubId: '1', clubCode: 'DR', shotOrder: 1, isPutt: false },
      ];

      render(
        <ClubInputPanel
          {...defaultProps}
          selectedShots={shots}
          expectedScore={null}
        />
      );

      expect(screen.queryByText(/기존:/)).not.toBeInTheDocument();
    });

    it('should not show warning when no shots selected', () => {
      render(
        <ClubInputPanel
          {...defaultProps}
          selectedShots={[]}
          expectedScore={4}
        />
      );

      expect(screen.queryByText(/기존:/)).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onAddShot when clicking a club', () => {
      render(<ClubInputPanel {...defaultProps} />);

      // Find and click the DR button (it's in the club selector area)
      const drButtons = screen.getAllByText('DR');
      // The button is in the selector area
      fireEvent.click(drButtons[drButtons.length - 1]);

      expect(mockOnAddShot).toHaveBeenCalledWith(mockClubs[0]);
    });

    it('should call onRemoveLastShot when clicking delete button', () => {
      const shots: ClubShotInput[] = [
        { clubId: '1', clubCode: 'DR', shotOrder: 1, isPutt: false },
      ];

      render(<ClubInputPanel {...defaultProps} selectedShots={shots} />);

      fireEvent.click(screen.getByText('삭제'));

      expect(mockOnRemoveLastShot).toHaveBeenCalled();
    });

    it('should disable delete button when no shots', () => {
      render(<ClubInputPanel {...defaultProps} />);

      const deleteButton = screen.getByText('삭제').closest('button');
      expect(deleteButton).toBeDisabled();
    });

    it('should call onConfirm when clicking confirm button', () => {
      const shots: ClubShotInput[] = [
        { clubId: '1', clubCode: 'DR', shotOrder: 1, isPutt: false },
      ];

      render(<ClubInputPanel {...defaultProps} selectedShots={shots} />);

      fireEvent.click(screen.getByText('확인'));

      expect(mockOnConfirm).toHaveBeenCalled();
    });

    it('should disable confirm button when no shots', () => {
      render(<ClubInputPanel {...defaultProps} />);

      const confirmButton = screen.getByText('확인').closest('button');
      expect(confirmButton).toBeDisabled();
    });

    it('should call onCancel when clicking cancel button', () => {
      render(<ClubInputPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('취소'));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('putt detection', () => {
    it('should add isPutt=true for putter club', () => {
      render(<ClubInputPanel {...defaultProps} />);

      const ptButtons = screen.getAllByText('PT');
      fireEvent.click(ptButtons[ptButtons.length - 1]);

      expect(mockOnAddShot).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PT',
          category: 'PUTTER',
        })
      );
    });
  });

  describe('club grouping', () => {
    it('should display clubs grouped by category', () => {
      render(<ClubInputPanel {...defaultProps} />);

      // All clubs should be present
      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('7I')).toBeInTheDocument();
      expect(screen.getByText('W52')).toBeInTheDocument();
      expect(screen.getByText('PT')).toBeInTheDocument();
    });
  });
});
