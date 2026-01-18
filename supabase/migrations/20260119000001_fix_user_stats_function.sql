-- Fix get_user_stats function to not require exactly 18 holes
-- Migration: 20260119000001_fix_user_stats_function

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
      public.calculate_course_total_par(c.holes) as total_par,
      jsonb_array_length(c.holes) as hole_count
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
      cr.hole_count,
      COALESCE(SUM(s.strokes), 0) as total_strokes,
      COUNT(s.id) as score_count
    FROM completed_rounds cr
    JOIN public.round_players rp ON rp.round_id = cr.round_id AND rp.is_owner = TRUE
    LEFT JOIN public.scores s ON s.round_player_id = rp.id
    GROUP BY cr.round_id, cr.play_date, cr.total_par, cr.hole_count
    HAVING COUNT(s.id) > 0  -- At least one score recorded
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
    'averageScore', COALESCE((SELECT ROUND(AVG(total_strokes)::numeric, 1) FROM round_scores WHERE score_count = hole_count), 0),
    'bestScore', COALESCE((SELECT MIN(total_strokes - total_par) FROM round_scores WHERE score_count = hole_count), 0),
    'bestScoreDate', (
      SELECT play_date FROM round_scores
      WHERE score_count = hole_count
      ORDER BY (total_strokes - total_par) ASC LIMIT 1
    ),
    'handicap', COALESCE((
      SELECT ROUND(
        (AVG(diff) * 0.96)::numeric, 1
      ) FROM (
        SELECT (total_strokes - total_par) as diff
        FROM round_scores
        WHERE score_count = hole_count
        ORDER BY play_date DESC LIMIT 20
      ) recent
    ), 0),
    'recentScores', COALESCE((
      SELECT json_agg(total_strokes - total_par ORDER BY play_date DESC)
      FROM (SELECT * FROM round_scores WHERE score_count = hole_count ORDER BY play_date DESC LIMIT 10) r
    ), '[]'::json),
    'scoreDistribution', COALESCE(
      (SELECT json_object_agg(category, cnt) FROM score_distribution),
      '{}'::json
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
