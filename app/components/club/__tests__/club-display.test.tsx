import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClubDisplay } from '../club-display';
import type { HoleClubData } from '~/types';

describe('ClubDisplay', () => {
  const mockHoles = [
    { hole: 1, par: 4 },
    { hole: 2, par: 3 },
    { hole: 3, par: 5 },
    { hole: 5, par: 4 },
  ];

  describe('rendering', () => {
    it('should render hole number', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 5,
          strokes: 4,
          clubs: [
            { shotOrder: 1, clubCode: 'DR', clubName: '드라이버', isPutt: false },
            { shotOrder: 2, clubCode: '7I', clubName: '7번 아이언', isPutt: false },
            { shotOrder: 3, clubCode: 'PT', clubName: '퍼터', isPutt: true },
            { shotOrder: 4, clubCode: 'PT', clubName: '퍼터', isPutt: true },
          ],
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render all club codes in sequence', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 5,
          clubs: [
            { shotOrder: 1, clubCode: 'DR', clubName: '드라이버', isPutt: false },
            { shotOrder: 2, clubCode: '5I', clubName: '5번 아이언', isPutt: false },
            { shotOrder: 3, clubCode: 'W52', clubName: '52도 웨지', isPutt: false },
            { shotOrder: 4, clubCode: 'PT', clubName: '퍼터', isPutt: true },
            { shotOrder: 5, clubCode: 'PT', clubName: '퍼터', isPutt: true },
          ],
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('5I')).toBeInTheDocument();
      expect(screen.getByText('W52')).toBeInTheDocument();
    });

    it('should render score relative to par', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 5,
          clubs: [
            { shotOrder: 1, clubCode: 'DR', clubName: '드라이버', isPutt: false },
            { shotOrder: 2, clubCode: '7I', clubName: '7번 아이언', isPutt: false },
            { shotOrder: 3, clubCode: 'W52', clubName: '52도 웨지', isPutt: false },
            { shotOrder: 4, clubCode: 'PT', clubName: '퍼터', isPutt: true },
            { shotOrder: 5, clubCode: 'PT', clubName: '퍼터', isPutt: true },
          ],
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      // +1 for bogey (5 strokes on par 4)
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('should show arrows between clubs', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 3,
          clubs: [
            { shotOrder: 1, clubCode: 'DR', clubName: '드라이버', isPutt: false },
            { shotOrder: 2, clubCode: '7I', clubName: '7번 아이언', isPutt: false },
            { shotOrder: 3, clubCode: 'PT', clubName: '퍼터', isPutt: true },
          ],
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      const arrows = screen.getAllByText('→');
      expect(arrows.length).toBe(2); // 2 arrows for 3 clubs
    });
  });

  describe('putt highlighting', () => {
    it('should highlight putt clubs differently', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 2,
          clubs: [
            { shotOrder: 1, clubCode: '7I', clubName: '7번 아이언', isPutt: false },
            { shotOrder: 2, clubCode: 'PT', clubName: '퍼터', isPutt: true },
          ],
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      // Putter should have green background class
      const putterElement = screen.getByText('PT').closest('span');
      expect(putterElement).toHaveClass('bg-green-100');
    });

    it('should not highlight non-putt clubs', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 1,
          clubs: [
            { shotOrder: 1, clubCode: 'DR', clubName: '드라이버', isPutt: false },
          ],
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      const drElement = screen.getByText('DR').closest('span');
      expect(drElement).not.toHaveClass('bg-green-100');
      expect(drElement).toHaveClass('bg-muted');
    });
  });

  describe('score colors', () => {
    it('should show birdie score in appropriate color', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 3,
          clubs: [
            { shotOrder: 1, clubCode: 'DR', clubName: '드라이버', isPutt: false },
            { shotOrder: 2, clubCode: '7I', clubName: '7번 아이언', isPutt: false },
            { shotOrder: 3, clubCode: 'PT', clubName: '퍼터', isPutt: true },
          ],
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      // -1 for birdie (3 strokes on par 4)
      expect(screen.getByText('-1')).toBeInTheDocument();
    });

    it('should show par score as 0', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 4,
          clubs: [
            { shotOrder: 1, clubCode: 'DR', clubName: '드라이버', isPutt: false },
            { shotOrder: 2, clubCode: '7I', clubName: '7번 아이언', isPutt: false },
            { shotOrder: 3, clubCode: 'PT', clubName: '퍼터', isPutt: true },
            { shotOrder: 4, clubCode: 'PT', clubName: '퍼터', isPutt: true },
          ],
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      // formatScoreToPar returns '0' for par
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('empty clubs', () => {
    it('should return null when all holes have empty clubs', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 4,
          clubs: [],
        },
      ];

      const { container } = render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      expect(container.firstChild).toBeNull();
    });

    it('should return null when clubs is null', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 4,
          clubs: null,
        },
      ];

      const { container } = render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      expect(container.firstChild).toBeNull();
    });

    it('should only show holes with clubs', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 4,
          clubs: [
            { shotOrder: 1, clubCode: 'DR', clubName: '드라이버', isPutt: false },
          ],
        },
        {
          hole_number: 2,
          strokes: 3,
          clubs: [], // empty
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });

  describe('multiple holes', () => {
    it('should render multiple holes with clubs', () => {
      const holeClubs: HoleClubData[] = [
        {
          hole_number: 1,
          strokes: 4,
          clubs: [
            { shotOrder: 1, clubCode: 'DR', clubName: '드라이버', isPutt: false },
          ],
        },
        {
          hole_number: 3,
          strokes: 6,
          clubs: [
            { shotOrder: 1, clubCode: '3W', clubName: '3번 우드', isPutt: false },
          ],
        },
      ];

      render(<ClubDisplay holeClubs={holeClubs} holes={mockHoles} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('DR')).toBeInTheDocument();
      expect(screen.getByText('3W')).toBeInTheDocument();
    });
  });
});
