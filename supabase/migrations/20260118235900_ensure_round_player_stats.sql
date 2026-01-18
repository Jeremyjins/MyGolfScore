-- Ensure round_player stats columns exist (re-apply if needed)
-- Migration: 20260118235900_ensure_round_player_stats

-- Add columns for caching computed score values
ALTER TABLE public.round_players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_score INTEGER,
  ADD COLUMN IF NOT EXISTS score_to_par INTEGER;

-- Create index for efficient user-based queries
CREATE INDEX IF NOT EXISTS idx_round_players_user ON public.round_players(user_id);
