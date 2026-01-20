-- ============================================================
-- My Golf Score - Email Authentication Migration
-- Migration: 20260120100000_email_auth_migration
-- Purpose: PIN 기반 인증 → 이메일 기반 Supabase Auth 전환
-- ============================================================

-- ============================================
-- Step 1: 기존 데이터를 새 auth user로 마이그레이션
-- 새 사용자 UUID: fe010041-f90f-445d-91ac-ce8a69e00aef (jeremyjins@gmail.com)
-- ============================================
DO $$
DECLARE
  old_profile_id UUID;
  old_profile_name TEXT;
  new_auth_user_id UUID := 'fe010041-f90f-445d-91ac-ce8a69e00aef';
  profile_exists BOOLEAN;
BEGIN
  -- 새 auth user의 profile이 이미 존재하는지 확인
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = new_auth_user_id) INTO profile_exists;

  -- 기존 profile ID와 이름 찾기 (새 auth user가 아닌 것)
  SELECT id, name INTO old_profile_id, old_profile_name
  FROM profiles
  WHERE id != new_auth_user_id
  LIMIT 1;

  -- ★ 중요: 새 auth user의 profile을 먼저 생성해야 함 (FK 제약조건 충족)
  IF NOT profile_exists THEN
    INSERT INTO profiles (id, name, pin_hash)
    VALUES (new_auth_user_id, COALESCE(old_profile_name, '진대성'), 'migrated_to_email_auth')
    ON CONFLICT (id) DO UPDATE SET name = COALESCE(old_profile_name, '진대성');
    RAISE NOTICE 'Created profile for auth user: %', new_auth_user_id;
  END IF;

  -- 기존 데이터가 있으면 마이그레이션
  IF old_profile_id IS NOT NULL THEN
    RAISE NOTICE 'Migrating data from profile % to auth user %', old_profile_id, new_auth_user_id;

    -- courses 테이블 마이그레이션
    UPDATE courses SET user_id = new_auth_user_id WHERE user_id = old_profile_id;
    RAISE NOTICE 'Migrated courses';

    -- companions 테이블 마이그레이션
    UPDATE companions SET user_id = new_auth_user_id WHERE user_id = old_profile_id;
    RAISE NOTICE 'Migrated companions';

    -- rounds 테이블 마이그레이션
    UPDATE rounds SET user_id = new_auth_user_id WHERE user_id = old_profile_id;
    RAISE NOTICE 'Migrated rounds';

    -- 기존 profile 삭제
    DELETE FROM profiles WHERE id = old_profile_id;
    RAISE NOTICE 'Deleted old profile: %', old_profile_id;
  END IF;
END $$;

-- ============================================
-- Step 2: profiles 테이블에서 PIN 관련 컬럼 제거
-- ============================================
ALTER TABLE profiles DROP COLUMN IF EXISTS pin_hash;
ALTER TABLE profiles DROP COLUMN IF EXISTS login_attempts;
ALTER TABLE profiles DROP COLUMN IF EXISTS lockout_level;
ALTER TABLE profiles DROP COLUMN IF EXISTS locked_until;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_locked;

-- profiles.name 기본값을 '사용자'로 변경 (신규 가입자용)
ALTER TABLE profiles ALTER COLUMN name SET DEFAULT '사용자';

-- ============================================
-- Step 3: 신규 가입 시 profile 자동 생성 트리거
-- auth.users 테이블에 INSERT 시 profiles 테이블에 자동으로 row 생성
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', '사용자')
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RETURN new;
END;
$$;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Step 4: PIN 관련 함수 삭제
-- ============================================
DROP FUNCTION IF EXISTS public.record_failed_login(UUID);
DROP FUNCTION IF EXISTS public.check_rate_limit(UUID);
DROP FUNCTION IF EXISTS public.record_successful_login(UUID);
DROP FUNCTION IF EXISTS public.reset_login_state(UUID);

-- ============================================
-- Step 5: RLS (Row Level Security) 활성화
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 6: RLS 정책 생성
-- ============================================

-- profiles 테이블: 본인만 조회/수정 가능
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- courses 테이블: 본인 데이터만 CRUD 가능
DROP POLICY IF EXISTS "courses_all_own" ON courses;
DROP POLICY IF EXISTS "courses_all" ON courses;

CREATE POLICY "courses_all_own" ON courses
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- companions 테이블: 본인 데이터만 CRUD 가능
DROP POLICY IF EXISTS "companions_all_own" ON companions;
DROP POLICY IF EXISTS "companions_all" ON companions;

CREATE POLICY "companions_all_own" ON companions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- rounds 테이블: 본인 데이터만 CRUD 가능
DROP POLICY IF EXISTS "rounds_all_own" ON rounds;
DROP POLICY IF EXISTS "rounds_all" ON rounds;

CREATE POLICY "rounds_all_own" ON rounds
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- round_players 테이블: 본인 라운드의 플레이어만 접근 가능
DROP POLICY IF EXISTS "round_players_all_own" ON round_players;
DROP POLICY IF EXISTS "round_players_all" ON round_players;

CREATE POLICY "round_players_all_own" ON round_players
  FOR ALL
  USING (
    round_id IN (
      SELECT id FROM rounds WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    round_id IN (
      SELECT id FROM rounds WHERE user_id = auth.uid()
    )
  );

-- scores 테이블: 본인 라운드의 스코어만 접근 가능
DROP POLICY IF EXISTS "scores_all_own" ON scores;
DROP POLICY IF EXISTS "scores_all" ON scores;

CREATE POLICY "scores_all_own" ON scores
  FOR ALL
  USING (
    round_player_id IN (
      SELECT rp.id
      FROM round_players rp
      INNER JOIN rounds r ON rp.round_id = r.id
      WHERE r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    round_player_id IN (
      SELECT rp.id
      FROM round_players rp
      INNER JOIN rounds r ON rp.round_id = r.id
      WHERE r.user_id = auth.uid()
    )
  );

-- ============================================
-- Step 7: 불필요한 인덱스 삭제
-- ============================================
DROP INDEX IF EXISTS idx_profiles_locked;

-- ============================================
-- Step 8: RPC 함수 업데이트 (RLS 우회 없이 auth.uid() 사용)
-- ============================================

-- get_user_stats 함수 업데이트: user_id 파라미터 대신 auth.uid() 사용
CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  p_user_id UUID;
BEGIN
  -- 현재 로그인한 사용자 ID
  p_user_id := auth.uid();

  IF p_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  WITH completed_rounds AS (
    SELECT
      r.id as round_id,
      r.play_date,
      c.holes,
      public.calculate_course_total_par(c.holes) as total_par
    FROM rounds r
    JOIN courses c ON r.course_id = c.id
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
    JOIN round_players rp ON rp.round_id = cr.round_id AND rp.is_owner = TRUE
    LEFT JOIN scores s ON s.round_player_id = rp.id
    GROUP BY cr.round_id, cr.play_date, cr.total_par
    HAVING COUNT(s.id) = 18
  ),
  handicap_calc AS (
    SELECT
      diff,
      ROW_NUMBER() OVER (ORDER BY diff ASC) as rank,
      COUNT(*) OVER () as total_count
    FROM (
      SELECT (total_strokes - total_par) as diff
      FROM round_scores
      ORDER BY play_date DESC
      LIMIT 20
    ) recent_diffs
  ),
  top_40_percent AS (
    SELECT AVG(diff) as avg_diff
    FROM handicap_calc
    WHERE rank <= GREATEST(1, CEIL(total_count * 0.4))
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
    FROM scores s
    JOIN round_players rp ON s.round_player_id = rp.id
    JOIN rounds r ON rp.round_id = r.id
    JOIN courses c ON r.course_id = c.id
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
    'handicap', COALESCE(
      (SELECT ROUND((avg_diff * 0.96)::numeric, 1) FROM top_40_percent),
      0
    ),
    'recentScores', COALESCE((
      SELECT json_agg(score_diff ORDER BY play_date DESC)
      FROM (
        SELECT total_strokes - total_par as score_diff, play_date
        FROM round_scores
        ORDER BY play_date DESC
        LIMIT 10
      ) r
    ), '[]'::json),
    'scoreDistribution', COALESCE(
      (SELECT json_object_agg(category, cnt) FROM score_distribution),
      '{}'::json
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- get_companions_with_stats 함수 업데이트
CREATE OR REPLACE FUNCTION public.get_companions_with_stats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  nickname TEXT,
  is_favorite BOOLEAN,
  round_count BIGINT,
  average_score NUMERIC,
  last_played DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_user_id UUID;
BEGIN
  p_user_id := auth.uid();

  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.nickname,
    c.is_favorite,
    COUNT(DISTINCT r.id) as round_count,
    ROUND(AVG(
      (SELECT SUM(s.strokes) FROM scores s WHERE s.round_player_id = rp.id)
    )::numeric, 1) as average_score,
    MAX(r.play_date) as last_played
  FROM companions c
  LEFT JOIN round_players rp ON rp.companion_id = c.id
  LEFT JOIN rounds r ON rp.round_id = r.id AND r.status = 'completed'
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.name, c.nickname, c.is_favorite
  ORDER BY c.is_favorite DESC, c.name;
END;
$$;

-- ============================================
-- Migration Complete
-- ============================================
-- 주의사항:
-- 1. 이 마이그레이션 실행 전에 Supabase Dashboard에서 이메일 인증 사용자를 먼저 생성해야 합니다
--    Email: jeremyjins@gmail.com
--    UID: fe010041-f90f-445d-91ac-ce8a69e00aef
-- 2. 마이그레이션 후 애플리케이션 코드도 업데이트해야 합니다
-- 3. 환경변수에 SUPABASE_ANON_KEY 추가 필요
