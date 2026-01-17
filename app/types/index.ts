// My Golf Score App - Type Definitions

export * from './database';

// ============================================
// Domain Types
// ============================================

export interface HoleInfo {
  hole: number;
  par: number; // Typically 3, 4, or 5
}

export interface Profile {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  name: string;
  holes: HoleInfo[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Companion {
  id: string;
  user_id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

// CompanionWithStats from get_companions_with_stats RPC function
export interface CompanionWithStats {
  id: string;
  name: string;
  nickname: string | null;
  is_favorite: boolean;
  round_count: number;
  average_score: number | null;
  last_played: string | null;
}

export interface Round {
  id: string;
  user_id: string;
  course_id: string | null;
  play_date: string;
  tee_time: string | null;
  status: 'in_progress' | 'completed';
  local_id: string | null;
  sync_status: 'pending' | 'synced';
  created_at: string;
  updated_at: string;
}

export interface RoundPlayer {
  id: string;
  round_id: string;
  companion_id: string | null;
  is_owner: boolean;
  player_order: number;
  created_at: string;
}

export interface Score {
  id: string;
  round_player_id: string;
  hole_number: number;
  strokes: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Extended Types (with relations)
// ============================================

export interface RoundWithCourse extends Round {
  course: Course | null;
}

export interface RoundPlayerWithCompanion extends RoundPlayer {
  companion: Companion | null;
}

export interface RoundPlayerWithScores extends RoundPlayerWithCompanion {
  scores: Score[];
}

export interface RoundDetailPlayer {
  id: string;
  name: string;
  isUser: boolean;
  scores: Record<number, number>; // hole_number -> strokes
  totalScore: number | null;
  scoreToPar: number | null;
}

export interface RoundDetail {
  id: string;
  playDate: string;
  teeTime: string | null;
  status: 'in_progress' | 'completed';
  course: {
    id: string;
    name: string;
    holes: HoleInfo[];
  } | null;
  players: RoundDetailPlayer[];
}

export interface RoundWithDetails extends Round {
  course: Course | null;
  players: RoundPlayerWithScores[];
}

// ============================================
// Statistics Types
// ============================================

export interface UserStats {
  totalRounds: number;
  averageScore: number;
  bestScore: number;
  bestScoreDate: string | null;
  handicap: number;
  recentScores: number[];
  scoreDistribution: {
    eagle?: number;
    birdie?: number;
    par?: number;
    bogey?: number;
    double?: number;
    triple_plus?: number;
  };
}

// ============================================
// Computed Types (for UI)
// ============================================

export interface PlayerScore {
  id: string;
  name: string;
  isUser: boolean;
  scores: Record<number, number>; // hole_number -> strokes
  totalScore: number | null;
  scoreToPar: number | null;
}

// ============================================
// Component Props Types
// ============================================

export interface ScoreTableProps {
  course: {
    name: string;
    holes: HoleInfo[];
    total_par: number;
  };
  players: {
    id: string;
    name: string;
    isOwner: boolean;
    scores: { hole_number: number; strokes: number }[];
  }[];
  activeHalf: 'out' | 'in';
  displayMode: 'par' | 'stroke';
  onScoreSelect: (playerId: string, hole: number, currentScore?: number) => void;
  selectedCell?: { playerId: string; hole: number };
}

export interface ScoreInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hole: number;
  par: number;
  playerName: string;
  currentScore?: number;
  onScoreSubmit: (score: number) => void;
}

export interface ScoreCellProps {
  par: number;
  strokes?: number;
  displayMode: 'par' | 'stroke';
  isSelected: boolean;
  onClick: () => void;
}

export interface RoundCardProps {
  round: RoundWithDetails;
  ownerName: string;
  onClick: () => void;
}

export interface PinPadProps {
  onComplete: (pin: string) => void;
  isLoading?: boolean;
  error?: string;
}

// ============================================
// Form Types
// ============================================

export interface CreateRoundInput {
  courseId: string;
  playDate: string;
  teeTime?: string;
  companionIds: string[];
  localId?: string;
}

export interface CreateCourseInput {
  name: string;
  holes: HoleInfo[];
}

export interface CreateCompanionInput {
  name: string;
  nickname?: string;
}

export interface UpdateScoreInput {
  roundPlayerId: string;
  holeNumber: number;
  strokes: number;
}

// ============================================
// Auth Types
// ============================================

export interface Session {
  userId: string;
  userName: string;
  expiresAt: number;
}

// ============================================
// Error Types
// ============================================

export type ErrorCode =
  | 'auth_required'
  | 'invalid_pin'
  | 'not_found'
  | 'duplicate'
  | 'validation'
  | 'offline'
  | 'sync_failed'
  | 'internal';

export interface AppErrorResponse {
  error: string;
  code: ErrorCode;
}
