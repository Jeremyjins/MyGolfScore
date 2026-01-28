-- Security & Performance Fix: Club Score Functions
-- Migration: 20260128_clubs_security_fix
--
-- Security: Add auth.uid() ownership verification to RPC functions
-- Performance: Use CTEs instead of correlated subqueries

-- ============================================
-- RPC 함수 1: get_round_club_stats (보안 + 성능 최적화)
-- 라운드 소유권 검증 + CTE 기반 쿼리
-- ============================================
CREATE OR REPLACE FUNCTION public.get_round_club_stats(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_user_id UUID;
BEGIN
  -- 현재 인증된 사용자 확인
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 라운드 소유권 검증
  IF NOT EXISTS (
    SELECT 1 FROM public.rounds
    WHERE id = p_round_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to round';
  END IF;

  -- CTE 기반 최적화된 쿼리 (correlated subquery 제거)
  WITH owner_scores AS (
    -- 해당 라운드의 오너 스코어 (단일 스캔)
    SELECT s.id as score_id, s.hole_number, s.strokes
    FROM public.scores s
    JOIN public.round_players rp ON rp.id = s.round_player_id
    WHERE rp.round_id = p_round_id AND rp.is_owner = TRUE
  ),
  score_putts AS (
    -- 스코어별 퍼팅 수 사전 계산 (단일 스캔)
    SELECT cs.score_id, COUNT(*) as putt_count
    FROM public.club_shots cs
    JOIN public.clubs c ON c.id = cs.club_id
    WHERE c.code = 'PT' AND cs.score_id IN (SELECT score_id FROM owner_scores)
    GROUP BY cs.score_id
  ),
  hole_putts AS (
    -- 스코어와 퍼팅 수 조인
    SELECT os.score_id, COALESCE(sp.putt_count, 0) as putt_count
    FROM owner_scores os
    LEFT JOIN score_putts sp ON sp.score_id = os.score_id
  )
  SELECT json_build_object(
    'totalPutts', (SELECT COALESCE(SUM(putt_count), 0) FROM hole_putts),
    'puttDistribution', (
      SELECT json_agg(json_build_object('putts', putt_count, 'count', cnt))
      FROM (
        SELECT putt_count, COUNT(*) as cnt
        FROM hole_putts
        GROUP BY putt_count
        ORDER BY putt_count
      ) dist
    ),
    'clubUsage', (
      SELECT json_agg(json_build_object('code', code, 'name', name, 'count', usage_count))
      FROM (
        SELECT c.code, c.name, COUNT(*) as usage_count
        FROM public.club_shots cs
        JOIN public.clubs c ON c.id = cs.club_id
        WHERE cs.score_id IN (SELECT score_id FROM owner_scores)
        GROUP BY c.code, c.name, c.sort_order
        ORDER BY c.sort_order
      ) usage
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 함수 2: get_round_hole_clubs (보안 강화)
-- 라운드 소유권 검증 추가
-- ============================================
CREATE OR REPLACE FUNCTION public.get_round_hole_clubs(p_round_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_user_id UUID;
BEGIN
  -- 현재 인증된 사용자 확인
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 라운드 소유권 검증
  IF NOT EXISTS (
    SELECT 1 FROM public.rounds
    WHERE id = p_round_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to round';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 함수 3: get_user_club_stats (보안 + 성능 최적화)
-- auth.uid() 직접 사용 버전 + CTE 기반 쿼리
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_club_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  p_user_id UUID;
BEGIN
  -- 파라미터 대신 auth.uid() 직접 사용
  p_user_id := auth.uid();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- CTE 기반 최적화된 쿼리
  WITH completed_scores AS (
    -- 클럽 샷이 있는 완료된 라운드의 오너 스코어 (기본 데이터셋)
    SELECT DISTINCT s.id as score_id, r.id as round_id
    FROM public.rounds r
    JOIN public.round_players rp ON rp.round_id = r.id
    JOIN public.scores s ON s.round_player_id = rp.id
    JOIN public.club_shots cs ON cs.score_id = s.id
    WHERE r.user_id = p_user_id
      AND r.status = 'completed'
      AND rp.is_owner = TRUE
  ),
  round_count AS (
    SELECT COUNT(DISTINCT round_id) as cnt FROM completed_scores
  ),
  score_putts AS (
    -- 스코어별 퍼팅 수 사전 계산
    SELECT cs.score_id, COUNT(*) as putt_count
    FROM public.club_shots cs
    JOIN public.clubs c ON c.id = cs.club_id
    WHERE c.code = 'PT' AND cs.score_id IN (SELECT score_id FROM completed_scores)
    GROUP BY cs.score_id
  ),
  round_putts AS (
    -- 라운드별 총 퍼팅 수
    SELECT cs.round_id, SUM(COALESCE(sp.putt_count, 0)) as total_putts
    FROM completed_scores cs
    LEFT JOIN score_putts sp ON sp.score_id = cs.score_id
    GROUP BY cs.round_id
  ),
  hole_putt_distribution AS (
    -- 홀별 퍼팅 분포 (4퍼트 이상은 4로 통합)
    SELECT LEAST(COALESCE(sp.putt_count, 0), 4) as putt_category, COUNT(*) as hole_count
    FROM completed_scores cs
    LEFT JOIN score_putts sp ON sp.score_id = cs.score_id
    GROUP BY putt_category
  )
  SELECT json_build_object(
    'totalRounds', (SELECT cnt FROM round_count),
    'averagePutts', (SELECT ROUND(AVG(total_putts)::numeric, 1) FROM round_putts),
    'puttDistribution', (
      SELECT json_agg(json_build_object(
        'putts', putt_category,
        'count', hole_count,
        'percentage', ROUND(hole_count * 100.0 / NULLIF(SUM(hole_count) OVER (), 0), 1)
      ))
      FROM (SELECT * FROM hole_putt_distribution ORDER BY putt_category) d
    ),
    'clubUsageAverage', (
      SELECT json_agg(json_build_object(
        'code', code,
        'name', name,
        'averageUsage', ROUND(total_usage::numeric / NULLIF((SELECT cnt FROM round_count), 0), 1)
      ))
      FROM (
        SELECT c.code, c.name, COUNT(*) as total_usage
        FROM public.club_shots cs
        JOIN public.clubs c ON c.id = cs.club_id
        WHERE cs.score_id IN (SELECT score_id FROM completed_scores)
        GROUP BY c.code, c.name, c.sort_order
        ORDER BY c.sort_order
      ) usage
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 함수 3 (하위 호환성): get_user_club_stats(p_user_id)
-- 파라미터 버전 - auth.uid() 검증 포함 + CTE 최적화
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_club_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_auth_user UUID;
BEGIN
  -- 인증된 사용자 확인
  v_auth_user := auth.uid();

  IF v_auth_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 파라미터와 인증된 사용자가 일치하는지 확인
  IF p_user_id != v_auth_user THEN
    RAISE EXCEPTION 'Unauthorized: cannot access other user stats';
  END IF;

  -- CTE 기반 최적화된 쿼리
  WITH completed_scores AS (
    SELECT DISTINCT s.id as score_id, r.id as round_id
    FROM public.rounds r
    JOIN public.round_players rp ON rp.round_id = r.id
    JOIN public.scores s ON s.round_player_id = rp.id
    JOIN public.club_shots cs ON cs.score_id = s.id
    WHERE r.user_id = p_user_id
      AND r.status = 'completed'
      AND rp.is_owner = TRUE
  ),
  round_count AS (
    SELECT COUNT(DISTINCT round_id) as cnt FROM completed_scores
  ),
  score_putts AS (
    SELECT cs.score_id, COUNT(*) as putt_count
    FROM public.club_shots cs
    JOIN public.clubs c ON c.id = cs.club_id
    WHERE c.code = 'PT' AND cs.score_id IN (SELECT score_id FROM completed_scores)
    GROUP BY cs.score_id
  ),
  round_putts AS (
    SELECT cs.round_id, SUM(COALESCE(sp.putt_count, 0)) as total_putts
    FROM completed_scores cs
    LEFT JOIN score_putts sp ON sp.score_id = cs.score_id
    GROUP BY cs.round_id
  ),
  hole_putt_distribution AS (
    SELECT LEAST(COALESCE(sp.putt_count, 0), 4) as putt_category, COUNT(*) as hole_count
    FROM completed_scores cs
    LEFT JOIN score_putts sp ON sp.score_id = cs.score_id
    GROUP BY putt_category
  )
  SELECT json_build_object(
    'totalRounds', (SELECT cnt FROM round_count),
    'averagePutts', (SELECT ROUND(AVG(total_putts)::numeric, 1) FROM round_putts),
    'puttDistribution', (
      SELECT json_agg(json_build_object(
        'putts', putt_category,
        'count', hole_count,
        'percentage', ROUND(hole_count * 100.0 / NULLIF(SUM(hole_count) OVER (), 0), 1)
      ))
      FROM (SELECT * FROM hole_putt_distribution ORDER BY putt_category) d
    ),
    'clubUsageAverage', (
      SELECT json_agg(json_build_object(
        'code', code,
        'name', name,
        'averageUsage', ROUND(total_usage::numeric / NULLIF((SELECT cnt FROM round_count), 0), 1)
      ))
      FROM (
        SELECT c.code, c.name, COUNT(*) as total_usage
        FROM public.club_shots cs
        JOIN public.clubs c ON c.id = cs.club_id
        WHERE cs.score_id IN (SELECT score_id FROM completed_scores)
        GROUP BY c.code, c.name, c.sort_order
        ORDER BY c.sort_order
      ) usage
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 추가 인덱스 (성능 최적화)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_club_shots_score_club ON public.club_shots(score_id, club_id);
CREATE INDEX IF NOT EXISTS idx_round_players_round_owner ON public.round_players(round_id, is_owner);
