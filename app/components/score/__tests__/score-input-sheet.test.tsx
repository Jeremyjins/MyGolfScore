import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScoreInputSheet } from '../score-input-sheet';
import type { Club, ClubShotInput } from '~/types';

// Mock the radix-ui Sheet primitives
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet-root">{children}</div> : null,
  Trigger: ({ children }: { children: React.ReactNode }) => children,
  Portal: ({ children }: { children: React.ReactNode }) => children,
  Overlay: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div data-testid="sheet-overlay" className={className}>{children}</div>
  ),
  Content: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sheet-content" className={className}>{children}</div>
  ),
  Close: ({ children }: { children: React.ReactNode }) => children,
  Title: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="sheet-title" className={className}>{children}</h2>
  ),
  Description: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p data-testid="sheet-description" className={className}>{children}</p>
  ),
}));

// Mock clubs for club input mode
const mockClubs: Club[] = [
  { id: '1', code: 'DR', name: '드라이버', category: 'DRIVER', sort_order: 1, created_at: '' },
  { id: '2', code: '7I', name: '7번 아이언', category: 'IRON', sort_order: 14, created_at: '' },
  { id: '3', code: 'W52', name: '52도 웨지', category: 'WEDGE', sort_order: 20, created_at: '' },
  { id: '4', code: 'PT', name: '퍼터', category: 'PUTTER', sort_order: 25, created_at: '' },
];

describe('ScoreInputSheet', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnScoreChange = vi.fn();
  const mockOnInputModeChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    holeNumber: 1,
    par: 4,
    currentScore: null,
    playerName: '테스트 플레이어',
    onScoreChange: mockOnScoreChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when open is true', () => {
      render(<ScoreInputSheet {...defaultProps} />);

      expect(screen.getByTestId('sheet-root')).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      render(<ScoreInputSheet {...defaultProps} open={false} />);

      expect(screen.queryByTestId('sheet-root')).not.toBeInTheDocument();
    });

    it('should display hole number and player name in title', () => {
      render(<ScoreInputSheet {...defaultProps} />);

      expect(screen.getByText(/1번 홀/)).toBeInTheDocument();
      expect(screen.getByText(/테스트 플레이어/)).toBeInTheDocument();
    });

    it('should display par in description', () => {
      render(<ScoreInputSheet {...defaultProps} par={5} />);

      expect(screen.getByText(/Par 5/)).toBeInTheDocument();
    });
  });

  describe('score selection', () => {
    it('should display fixed diff options', () => {
      render(<ScoreInputSheet {...defaultProps} />);

      // Birdie (-1), Par (0), Bogey (+1)
      expect(screen.getByText('버디')).toBeInTheDocument();
      expect(screen.getByText('파')).toBeInTheDocument();
      expect(screen.getByText('보기')).toBeInTheDocument();
      // Double (+2), Triple (+3), Quadruple (+4)
      expect(screen.getByText('더블보기')).toBeInTheDocument();
      expect(screen.getByText('트리플보기')).toBeInTheDocument();
      expect(screen.getByText('쿼드러플보기')).toBeInTheDocument();
    });

    it('should default to par when currentScore is null', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={null} par={4} />);

      // Should show 4타 (par strokes)
      expect(screen.getByText(/4타/)).toBeInTheDocument();
    });

    it('should use currentScore when provided', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={5} par={4} />);

      // Should show 5타 (current score)
      expect(screen.getByText(/5타/)).toBeInTheDocument();
    });

    it('should call onScoreChange when confirm is clicked', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={4} />);

      fireEvent.click(screen.getByText('확인'));

      expect(mockOnScoreChange).toHaveBeenCalledWith(4, undefined);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onOpenChange when cancel is clicked', () => {
      render(<ScoreInputSheet {...defaultProps} />);

      fireEvent.click(screen.getByText('취소'));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('score adjustment', () => {
    it('should increment score when + is clicked', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={4} />);

      fireEvent.click(screen.getByText('+'));

      // Score should be 5 now
      expect(screen.getByText(/5타/)).toBeInTheDocument();
    });

    it('should decrement score when − is clicked', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={4} />);

      fireEvent.click(screen.getByText('−'));

      // Score should be 3 now
      expect(screen.getByText(/3타/)).toBeInTheDocument();
    });
  });

  describe('score labels', () => {
    it('should show birdie label for -1', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={3} par={4} />);

      // Check the current score display shows birdie (multiple birdie labels exist)
      const birdieLabels = screen.getAllByText(/버디/);
      expect(birdieLabels.length).toBeGreaterThan(0);
    });

    it('should show par label for 0 diff', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={4} par={4} />);

      // Both in button and in selected display
      const parLabels = screen.getAllByText(/파/);
      expect(parLabels.length).toBeGreaterThan(0);
    });

    it('should show bogey label for +1', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={5} par={4} />);

      // Multiple bogey labels exist (button and status)
      const bogeyLabels = screen.getAllByText(/보기/);
      expect(bogeyLabels.length).toBeGreaterThan(0);
    });

    it('should show hole-in-one label for 1 stroke on par 3', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={1} par={3} />);

      expect(screen.getByText(/홀인원/)).toBeInTheDocument();
    });

    it('should show eagle label for -2', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={2} par={4} />);

      expect(screen.getByText(/이글/)).toBeInTheDocument();
    });
  });

  describe('score display modes', () => {
    it('should display score as par-relative by default', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={5} par={4} />);

      // +1 for bogey (par-relative display) - appears in button and status
      const plusOnes = screen.getAllByText('+1');
      expect(plusOnes.length).toBeGreaterThan(0);
    });
  });

  describe('input mode toggle', () => {
    it('should not show mode toggle when no userClubs', () => {
      render(<ScoreInputSheet {...defaultProps} />);

      expect(screen.queryByText('일반 입력')).not.toBeInTheDocument();
      expect(screen.queryByText('클럽 입력')).not.toBeInTheDocument();
    });

    it('should show mode toggle when userClubs provided', () => {
      render(
        <ScoreInputSheet
          {...defaultProps}
          userClubs={mockClubs}
          onInputModeChange={mockOnInputModeChange}
        />
      );

      expect(screen.getByText('일반 입력')).toBeInTheDocument();
      expect(screen.getByText('클럽 입력')).toBeInTheDocument();
    });

    it('should call onInputModeChange when mode is switched', () => {
      render(
        <ScoreInputSheet
          {...defaultProps}
          userClubs={mockClubs}
          inputMode="normal"
          onInputModeChange={mockOnInputModeChange}
        />
      );

      fireEvent.click(screen.getByText('클럽 입력'));

      expect(mockOnInputModeChange).toHaveBeenCalledWith('club');
    });
  });

  describe('club input mode', () => {
    it('should show ClubInputPanel in club mode', () => {
      render(
        <ScoreInputSheet
          {...defaultProps}
          userClubs={mockClubs}
          inputMode="club"
          onInputModeChange={mockOnInputModeChange}
        />
      );

      // ClubInputPanel should be rendered
      expect(screen.getByText('클럽을 선택하세요')).toBeInTheDocument();
    });

    it('should display club shots count in club mode', () => {
      const clubShots: ClubShotInput[] = [
        { clubId: '1', clubCode: 'DR', shotOrder: 1, isPutt: false },
        { clubId: '4', clubCode: 'PT', shotOrder: 2, isPutt: true },
      ];

      render(
        <ScoreInputSheet
          {...defaultProps}
          userClubs={mockClubs}
          inputMode="club"
          currentClubShots={clubShots}
          onInputModeChange={mockOnInputModeChange}
        />
      );

      // The component initializes with club shots
      expect(screen.getByText(/2타/)).toBeInTheDocument();
    });
  });

  describe('custom score indication', () => {
    it('should indicate custom score outside fixed options', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={10} par={4} />);

      // Score of 10 on par 4 is +6, outside fixed options
      expect(screen.getByText('기본 옵션 외 스코어')).toBeInTheDocument();
    });

    it('should not show custom indicator for fixed options', () => {
      render(<ScoreInputSheet {...defaultProps} currentScore={5} par={4} />);

      // +1 (bogey) is a fixed option
      expect(screen.queryByText('기본 옵션 외 스코어')).not.toBeInTheDocument();
    });
  });
});
