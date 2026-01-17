-- My Golf Score App - SQL Functions
-- Migration: 20260117000002_create_functions

-- ============================================
-- 1. 코스 총 Par 계산 함수
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_course_total_par(holes JSONB)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM((h->>'par')::int) FROM jsonb_array_elements(holes) h),
    0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 2. 사용자 통계 조회 함수
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH completed_rounds AS (
    SELECT
      r.id as round_id,
      r.play_date,
      c.holes,
      public.calculate_course_total_par(c.holes) as total_par
    FROM public.rounds r
    JOIN public.courses c ON r.course_id = c.id
    WHERE r.user_id = p_user_id
      AND r.status = 'completed'
  ),
  round_scores AS (
    SELECT
      cr.round_id,
      cr.play_date,
      cr.total_par,
      COALESCE(SUM(s.strokes), 0) as total_strokes
    FROM completed_rounds cr
    JOIN public.round_players rp ON rp.round_id = cr.round_id AND rp.is_owner = TRUE
    LEFT JOIN public.scores s ON s.round_player_id = rp.id
    GROUP BY cr.round_id, cr.play_date, cr.total_par
    HAVING COUNT(s.id) = 18
  ),
  score_distribution AS (
    SELECT
      CASE
        WHEN s.strokes <= (h->>'par')::int - 2 THEN 'eagle'
        WHEN s.strokes = (h->>'par')::int - 1 THEN 'birdie'
        WHEN s.strokes = (h->>'par')::int THEN 'par'
        WHEN s.strokes = (h->>'par')::int + 1 THEN 'bogey'
        WHEN s.strokes = (h->>'par')::int + 2 THEN 'double'
        ELSE 'triple_plus'
      END as category,
      COUNT(*) as cnt
    FROM public.scores s
    JOIN public.round_players rp ON s.round_player_id = rp.id
    JOIN public.rounds r ON rp.round_id = r.id
    JOIN public.courses c ON r.course_id = c.id
    CROSS JOIN LATERAL jsonb_array_elements(c.holes) AS h
    WHERE rp.is_owner = TRUE
      AND r.user_id = p_user_id
      AND r.status = 'completed'
      AND (h->>'hole')::int = s.hole_number
    GROUP BY category
  )
  SELECT json_build_object(
    'totalRounds', COALESCE((SELECT COUNT(*) FROM round_scores), 0),
    'averageScore', COALESCE((SELECT ROUND(AVG(total_strokes)::numeric, 1) FROM round_scores), 0),
    'bestScore', COALESCE((SELECT MIN(total_strokes - total_par) FROM round_scores), 0),
    'bestScoreDate', (
      SELECT play_date FROM round_scores
      ORDER BY (total_strokes - total_par) ASC LIMIT 1
    ),
    'handicap', COALESCE((
      SELECT ROUND(
        (AVG(diff) * 0.96)::numeric, 1
      ) FROM (
        SELECT (total_strokes - total_par) as diff
        FROM round_scores
        ORDER BY play_date DESC LIMIT 20
      ) recent
    ), 0),
    'recentScores', COALESCE((
      SELECT json_agg(total_strokes - total_par ORDER BY play_date DESC)
      FROM (SELECT * FROM round_scores ORDER BY play_date DESC LIMIT 10) r
    ), '[]'::json),
    'scoreDistribution', COALESCE(
      (SELECT json_object_agg(category, cnt) FROM score_distribution),
      '{}'::json
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. 동반자 통계 조회 함수
-- ============================================
CREATE OR REPLACE FUNCTION public.get_companions_with_stats(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  nickname TEXT,
  is_favorite BOOLEAN,
  round_count BIGINT,
  average_score NUMERIC,
  last_played DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.nickname,
    c.is_favorite,
    COUNT(DISTINCT r.id) as round_count,
    ROUND(AVG(
      (SELECT SUM(s.strokes) FROM public.scores s WHERE s.round_player_id = rp.id)
    )::numeric, 1) as average_score,
    MAX(r.play_date) as last_played
  FROM public.companions c
  LEFT JOIN public.round_players rp ON rp.companion_id = c.id
  LEFT JOIN public.rounds r ON rp.round_id = r.id AND r.status = 'completed'
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.name, c.nickname, c.is_favorite
  ORDER BY c.is_favorite DESC, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 라운드 상세 조회 함수
-- ============================================
CREATE OR REPLACE FUNCTION public.get_round_detail(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', r.id,
    'play_date', r.play_date,
    'tee_time', r.tee_time,
    'status', r.status,
    'course', json_build_object(
      'id', c.id,
      'name', c.name,
      'holes', c.holes,
      'total_par', public.calculate_course_total_par(c.holes)
    ),
    'players', (
      SELECT json_agg(
        json_build_object(
          'id', rp.id,
          'is_owner', rp.is_owner,
          'player_order', rp.player_order,
          'companion', CASE WHEN rp.companion_id IS NOT NULL THEN
            json_build_object('id', comp.id, 'name', comp.name)
          ELSE NULL END,
          'scores', COALESCE((
            SELECT json_agg(
              json_build_object(
                'id', s.id,
                'hole_number', s.hole_number,
                'strokes', s.strokes
              ) ORDER BY s.hole_number
            )
            FROM public.scores s WHERE s.round_player_id = rp.id
          ), '[]'::json)
        ) ORDER BY rp.player_order
      )
      FROM public.round_players rp
      LEFT JOIN public.companions comp ON rp.companion_id = comp.id
      WHERE rp.round_id = r.id
    )
  ) INTO result
  FROM public.rounds r
  LEFT JOIN public.courses c ON r.course_id = c.id
  WHERE r.id = p_round_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
