-- Add total_score and score_to_par columns to round_players table
-- Migration: 20260118000003_add_round_player_stats

-- Add columns for caching computed score values
ALTER TABLE public.round_players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_score INTEGER,
  ADD COLUMN IF NOT EXISTS score_to_par INTEGER;

-- Create index for efficient user-based queries
CREATE INDEX IF NOT EXISTS idx_round_players_user ON public.round_players(user_id);
