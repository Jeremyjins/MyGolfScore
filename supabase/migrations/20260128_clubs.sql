-- My Golf Score App - Club Score Feature
-- Migration: 20260128_clubs

-- ============================================
-- 1. clubs 테이블 (마스터 데이터 - 26개)
-- ============================================
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('DRIVER', 'WOOD', 'HYBRID', 'IRON', 'WEDGE', 'PUTTER')),
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clubs_category ON public.clubs(category);
CREATE INDEX IF NOT EXISTS idx_clubs_sort_order ON public.clubs(sort_order);

-- ============================================
-- 2. user_clubs 테이블 (사용자 클럽 세트)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_user_clubs_user ON public.user_clubs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clubs_active ON public.user_clubs(user_id, is_active);

-- ============================================
-- 3. club_shots 테이블 (샷별 클럽 기록)
-- ============================================
CREATE TABLE IF NOT EXISTS public.club_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  shot_order INTEGER NOT NULL CHECK (shot_order >= 1),
  is_putt BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(score_id, shot_order)
);

CREATE INDEX IF NOT EXISTS idx_club_shots_score ON public.club_shots(score_id);
CREATE INDEX IF NOT EXISTS idx_club_shots_club ON public.club_shots(club_id);

-- ============================================
-- RLS 활성화 및 정책 설정
-- ============================================
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_shots ENABLE ROW LEVEL SECURITY;

-- clubs: 마스터 데이터 - 모든 인증된 사용자가 읽을 수 있음
CREATE POLICY "clubs_select_authenticated" ON public.clubs
  FOR SELECT
  TO authenticated
  USING (true);

-- user_clubs: 사용자 본인의 클럽만 접근
CREATE POLICY "user_clubs_all_own" ON public.user_clubs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- club_shots: 사용자 본인의 라운드 스코어에 연결된 샷만 접근
CREATE POLICY "club_shots_all_own" ON public.club_shots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scores s
      JOIN public.round_players rp ON rp.id = s.round_player_id
      JOIN public.rounds r ON r.id = rp.round_id
      WHERE s.id = club_shots.score_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scores s
      JOIN public.round_players rp ON rp.id = s.round_player_id
      JOIN public.rounds r ON r.id = rp.round_id
      WHERE s.id = club_shots.score_id AND r.user_id = auth.uid()
    )
  );

-- ============================================
-- 시드 데이터: 26개 클럽
-- ============================================
INSERT INTO public.clubs (code, name, category, sort_order) VALUES
  -- DRIVER (1)
  ('DR', '드라이버', 'DRIVER', 1),
  -- WOOD (4)
  ('3W', '3번 우드', 'WOOD', 2),
  ('4W', '4번 우드', 'WOOD', 3),
  ('5W', '5번 우드', 'WOOD', 4),
  ('7W', '7번 우드', 'WOOD', 5),
  -- HYBRID (4)
  ('3H', '3번 하이브리드', 'HYBRID', 6),
  ('4H', '4번 하이브리드', 'HYBRID', 7),
  ('5H', '5번 하이브리드', 'HYBRID', 8),
  ('6H', '6번 하이브리드', 'HYBRID', 9),
  -- IRON (9)
  ('3I', '3번 아이언', 'IRON', 10),
  ('4I', '4번 아이언', 'IRON', 11),
  ('5I', '5번 아이언', 'IRON', 12),
  ('6I', '6번 아이언', 'IRON', 13),
  ('7I', '7번 아이언', 'IRON', 14),
  ('8I', '8번 아이언', 'IRON', 15),
  ('9I', '9번 아이언', 'IRON', 16),
  ('PW', '피칭 웨지', 'IRON', 17),
  -- WEDGE (7)
  ('W48', '48도 웨지', 'WEDGE', 18),
  ('W50', '50도 웨지', 'WEDGE', 19),
  ('W52', '52도 웨지', 'WEDGE', 20),
  ('W54', '54도 웨지', 'WEDGE', 21),
  ('W56', '56도 웨지', 'WEDGE', 22),
  ('W58', '58도 웨지', 'WEDGE', 23),
  ('W60', '60도 웨지', 'WEDGE', 24),
  -- PUTTER (1)
  ('PT', '퍼터', 'PUTTER', 25)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- RPC 함수 1: get_round_club_stats
-- 라운드별 클럽/퍼팅 통계
-- ============================================
CREATE OR REPLACE FUNCTION public.get_round_club_stats(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalPutts', (
      SELECT COALESCE(SUM(
        (SELECT COUNT(*) FROM public.club_shots cs2
         JOIN public.clubs c ON c.id = cs2.club_id
         WHERE cs2.score_id = s.id AND c.code = 'PT')
      ), 0)
      FROM public.scores s
      JOIN public.round_players rp ON rp.id = s.round_player_id
      WHERE rp.round_id = p_round_id AND rp.is_owner = TRUE
    ),
    'puttDistribution', (
      SELECT json_agg(json_build_object('putts', putts, 'count', hole_count))
      FROM (
        SELECT
          putt_count as putts,
          COUNT(*) as hole_count
        FROM (
          SELECT
            s.id as score_id,
            (SELECT COUNT(*) FROM public.club_shots cs
             JOIN public.clubs c ON c.id = cs.club_id
             WHERE cs.score_id = s.id AND c.code = 'PT') as putt_count
          FROM public.scores s
          JOIN public.round_players rp ON rp.id = s.round_player_id
          WHERE rp.round_id = p_round_id AND rp.is_owner = TRUE
        ) hole_putts
        GROUP BY putt_count
        ORDER BY putt_count
      ) dist
    ),
    'clubUsage', (
      SELECT json_agg(json_build_object('code', code, 'name', name, 'count', usage_count))
      FROM (
        SELECT
          c.code,
          c.name,
          COUNT(*) as usage_count
        FROM public.club_shots cs
        JOIN public.clubs c ON c.id = cs.club_id
        JOIN public.scores s ON s.id = cs.score_id
        JOIN public.round_players rp ON rp.id = s.round_player_id
        WHERE rp.round_id = p_round_id AND rp.is_owner = TRUE
        GROUP BY c.code, c.name, c.sort_order
        ORDER BY c.sort_order
      ) usage
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RPC 함수 2: get_round_hole_clubs
-- 홀별 클럽 순서
-- ============================================
CREATE OR REPLACE FUNCTION public.get_round_hole_clubs(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(hole_data ORDER BY hole_number)
  FROM (
    SELECT
      s.hole_number,
      s.strokes,
      (
        SELECT json_agg(
          json_build_object(
            'shotOrder', cs.shot_order,
            'clubCode', c.code,
            'clubName', c.name,
            'isPutt', cs.is_putt
          ) ORDER BY cs.shot_order
        )
        FROM public.club_shots cs
        JOIN public.clubs c ON c.id = cs.club_id
        WHERE cs.score_id = s.id
      ) as clubs
    FROM public.scores s
    JOIN public.round_players rp ON rp.id = s.round_player_id
    WHERE rp.round_id = p_round_id AND rp.is_owner = TRUE
  ) hole_data INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RPC 함수 3: get_user_club_stats
-- 전체 클럽 통계
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_club_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_rounds INTEGER;
BEGIN
  -- 클럽 샷 데이터가 있는 라운드 수
  SELECT COUNT(DISTINCT r.id) INTO total_rounds
  FROM public.rounds r
  JOIN public.round_players rp ON rp.round_id = r.id
  JOIN public.scores s ON s.round_player_id = rp.id
  JOIN public.club_shots cs ON cs.score_id = s.id
  WHERE r.user_id = p_user_id AND r.status = 'completed' AND rp.is_owner = TRUE;

  SELECT json_build_object(
    'totalRounds', total_rounds,
    'averagePutts', (
      SELECT ROUND(AVG(round_putts)::numeric, 1)
      FROM (
        SELECT
          r.id as round_id,
          SUM(
            (SELECT COUNT(*) FROM public.club_shots cs2
             JOIN public.clubs c ON c.id = cs2.club_id
             WHERE cs2.score_id = s.id AND c.code = 'PT')
          ) as round_putts
        FROM public.rounds r
        JOIN public.round_players rp ON rp.round_id = r.id
        JOIN public.scores s ON s.round_player_id = rp.id
        WHERE r.user_id = p_user_id AND r.status = 'completed' AND rp.is_owner = TRUE
          AND EXISTS (SELECT 1 FROM public.club_shots cs WHERE cs.score_id = s.id)
        GROUP BY r.id
      ) round_stats
    ),
    'puttDistribution', (
      SELECT json_agg(json_build_object('putts', putts, 'count', hole_count, 'percentage', ROUND(hole_count * 100.0 / NULLIF(SUM(hole_count) OVER (), 0), 1)))
      FROM (
        SELECT
          putt_count as putts,
          COUNT(*) as hole_count
        FROM (
          SELECT
            s.id as score_id,
            LEAST((SELECT COUNT(*) FROM public.club_shots cs
             JOIN public.clubs c ON c.id = cs.club_id
             WHERE cs.score_id = s.id AND c.code = 'PT'), 4) as putt_count
          FROM public.rounds r
          JOIN public.round_players rp ON rp.round_id = r.id
          JOIN public.scores s ON s.round_player_id = rp.id
          WHERE r.user_id = p_user_id AND r.status = 'completed' AND rp.is_owner = TRUE
            AND EXISTS (SELECT 1 FROM public.club_shots cs WHERE cs.score_id = s.id)
        ) hole_putts
        GROUP BY putt_count
        ORDER BY putt_count
      ) dist
    ),
    'clubUsageAverage', (
      SELECT json_agg(json_build_object('code', code, 'name', name, 'averageUsage', ROUND(total_usage::numeric / NULLIF(total_rounds, 0), 1)))
      FROM (
        SELECT
          c.code,
          c.name,
          c.sort_order,
          COUNT(*) as total_usage
        FROM public.club_shots cs
        JOIN public.clubs c ON c.id = cs.club_id
        JOIN public.scores s ON s.id = cs.score_id
        JOIN public.round_players rp ON rp.id = s.round_player_id
        JOIN public.rounds r ON r.id = rp.round_id
        WHERE r.user_id = p_user_id AND r.status = 'completed' AND rp.is_owner = TRUE
        GROUP BY c.code, c.name, c.sort_order
        ORDER BY c.sort_order
      ) usage
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
