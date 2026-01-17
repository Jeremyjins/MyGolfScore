-- My Golf Score App - Database Schema
-- Migration: 20260117000001_create_tables

-- ============================================
-- 1. profiles 테이블 (단일 사용자)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '진대성',
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. courses 테이블 (골프 코스)
-- ============================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  holes JSONB NOT NULL DEFAULT '[]',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_user ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_favorite ON public.courses(user_id, is_favorite);

-- ============================================
-- 3. companions 테이블 (동반자)
-- ============================================
CREATE TABLE IF NOT EXISTS public.companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  photo_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companions_user ON public.companions(user_id);
CREATE INDEX IF NOT EXISTS idx_companions_name ON public.companions(user_id, name);

-- ============================================
-- 4. rounds 테이블 (라운드)
-- ============================================
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  play_date DATE NOT NULL,
  tee_time TIME,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  local_id TEXT,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rounds_user_date ON public.rounds(user_id, play_date DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON public.rounds(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_local_id ON public.rounds(local_id) WHERE local_id IS NOT NULL;

-- ============================================
-- 5. round_players 테이블 (라운드 참가자)
-- ============================================
CREATE TABLE IF NOT EXISTS public.round_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  companion_id UUID REFERENCES public.companions(id) ON DELETE SET NULL,
  is_owner BOOLEAN DEFAULT FALSE,
  player_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_round_players_round ON public.round_players(round_id);

-- ============================================
-- 6. scores 테이블 (스코어)
-- ============================================
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_player_id UUID NOT NULL REFERENCES public.round_players(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  strokes INTEGER NOT NULL CHECK (strokes > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(round_player_id, hole_number)
);

CREATE INDEX IF NOT EXISTS idx_scores_player ON public.scores(round_player_id);

-- ============================================
-- updated_at 트리거 함수
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companions_updated_at
  BEFORE UPDATE ON public.companions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at
  BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS 비활성화 (단일 사용자 앱, Service Role 사용)
-- ============================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores DISABLE ROW LEVEL SECURITY;
