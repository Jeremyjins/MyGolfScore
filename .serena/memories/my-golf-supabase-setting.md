# My Golf Score - Supabase 설정 가이드

> Supabase 프로젝트: `qtishtqonwsokovvabpe`
> SQL Editor: https://supabase.com/dashboard/project/qtishtqonwsokovvabpe/sql/new

## 목차
1. [전체 설정 (한번에 실행)](#1-전체-설정-한번에-실행)
2. [테이블 생성](#2-테이블-생성)
3. [인덱스 생성](#3-인덱스-생성)
4. [트리거 및 함수](#4-트리거-및-함수)
5. [비즈니스 로직 함수](#5-비즈니스-로직-함수)
6. [Rate Limiting 함수](#6-rate-limiting-함수)
7. [RLS 정책](#7-rls-정책)
8. [초기 데이터 (선택)](#8-초기-데이터-선택)

---

## 1. 전체 설정 (한번에 실행)

**Supabase SQL Editor에서 아래 전체 SQL을 복사하여 실행하세요.**

```sql
-- ============================================================
-- My Golf Score App - Complete Database Setup
-- Version: 1.0.0
-- Date: 2026-01-18
-- ============================================================

-- ============================================
-- PART 1: 테이블 생성
-- ============================================

-- 1.1 profiles 테이블 (사용자)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '사용자',
  pin_hash TEXT NOT NULL,
  -- Rate limiting fields
  login_attempts INTEGER NOT NULL DEFAULT 0,
  lockout_level INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS '사용자 프로필 (단일 사용자 앱)';
COMMENT ON COLUMN public.profiles.pin_hash IS 'PBKDF2 해시된 PIN (salt:hash 형식)';
COMMENT ON COLUMN public.profiles.login_attempts IS '현재 잠금 단계의 실패한 로그인 시도 횟수 (0-2)';
COMMENT ON COLUMN public.profiles.lockout_level IS '잠금 진행 단계 (0: 없음, 1: 10분, 2: 1시간, 3: 6시간, 4: 영구잠금)';
COMMENT ON COLUMN public.profiles.locked_until IS '임시 잠금 해제 시간';
COMMENT ON COLUMN public.profiles.is_locked IS '영구 잠금 여부 (관리자가 직접 해제 필요)';

-- 1.2 courses 테이블 (골프 코스)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  holes JSONB NOT NULL DEFAULT '[]',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.courses IS '골프 코스 정보';
COMMENT ON COLUMN public.courses.holes IS 'JSON 배열: [{hole: 1, par: 4}, ...]';

-- 1.3 companions 테이블 (동반자)
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

COMMENT ON TABLE public.companions IS '함께 라운딩하는 동반자';

-- 1.4 rounds 테이블 (라운드)
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

COMMENT ON TABLE public.rounds IS '골프 라운드 기록';
COMMENT ON COLUMN public.rounds.local_id IS '오프라인 생성시 로컬 ID';
COMMENT ON COLUMN public.rounds.sync_status IS '동기화 상태';

-- 1.5 round_players 테이블 (라운드 참가자)
CREATE TABLE IF NOT EXISTS public.round_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  companion_id UUID REFERENCES public.companions(id) ON DELETE SET NULL,
  is_owner BOOLEAN DEFAULT FALSE,
  player_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.round_players IS '라운드 참가자 (본인 + 동반자)';
COMMENT ON COLUMN public.round_players.is_owner IS 'TRUE면 본인, FALSE면 동반자';

-- 1.6 scores 테이블 (스코어)
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_player_id UUID NOT NULL REFERENCES public.round_players(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  strokes INTEGER NOT NULL CHECK (strokes > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_player_id, hole_number)
);

COMMENT ON TABLE public.scores IS '홀별 스코어';

-- ============================================
-- PART 2: 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_courses_user ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_favorite ON public.courses(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_companions_user ON public.companions(user_id);
CREATE INDEX IF NOT EXISTS idx_companions_name ON public.companions(user_id, name);
CREATE INDEX IF NOT EXISTS idx_rounds_user_date ON public.rounds(user_id, play_date DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON public.rounds(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_local_id ON public.rounds(local_id) WHERE local_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_round_players_round ON public.round_players(round_id);
CREATE INDEX IF NOT EXISTS idx_scores_player ON public.scores(round_player_id);
CREATE INDEX IF NOT EXISTS idx_profiles_locked ON public.profiles(is_locked) WHERE is_locked = TRUE;

-- ============================================
-- PART 3: updated_at 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거가 없으면 생성 (IF NOT EXISTS 지원 안함)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_companions_updated_at ON public.companions;
CREATE TRIGGER update_companions_updated_at
  BEFORE UPDATE ON public.companions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rounds_updated_at ON public.rounds;
CREATE TRIGGER update_rounds_updated_at
  BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scores_updated_at ON public.scores;
CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PART 4: 비즈니스 로직 함수
-- ============================================

-- 4.1 코스 총 Par 계산
CREATE OR REPLACE FUNCTION public.calculate_course_total_par(holes JSONB)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM((h->>'par')::int) FROM jsonb_array_elements(holes) h),
    0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4.2 사용자 통계 조회
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

-- 4.3 동반자 통계 조회
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

-- 4.4 라운드 상세 조회
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

-- ============================================
-- PART 5: Rate Limiting 함수
-- ============================================

-- 5.1 로그인 상태 리셋 (관리자용)
CREATE OR REPLACE FUNCTION public.reset_login_state(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    login_attempts = 0,
    lockout_level = 0,
    locked_until = NULL,
    is_locked = FALSE,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 로그인 실패 기록
CREATE OR REPLACE FUNCTION public.record_failed_login(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_new_attempts INTEGER;
  v_new_level INTEGER;
  v_lockout_durations INTEGER[] := ARRAY[600, 3600, 21600]; -- 10분, 1시간, 6시간
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT login_attempts, lockout_level, locked_until, is_locked
  INTO v_profile
  FROM public.profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'USER_NOT_FOUND');
  END IF;

  IF v_profile.is_locked THEN
    RETURN jsonb_build_object('status', 'PERMANENTLY_LOCKED');
  END IF;

  v_new_attempts := v_profile.login_attempts + 1;

  IF v_new_attempts >= 3 THEN
    v_new_level := v_profile.lockout_level + 1;

    IF v_new_level >= 4 THEN
      UPDATE public.profiles
      SET login_attempts = 0, lockout_level = 4, is_locked = TRUE, updated_at = NOW()
      WHERE id = user_id;
      RETURN jsonb_build_object('status', 'PERMANENTLY_LOCKED');
    ELSE
      v_locked_until := NOW() + (v_lockout_durations[v_new_level] || ' seconds')::INTERVAL;
      UPDATE public.profiles
      SET login_attempts = 0, lockout_level = v_new_level, locked_until = v_locked_until, updated_at = NOW()
      WHERE id = user_id;
      RETURN jsonb_build_object(
        'status', 'TEMPORARILY_LOCKED',
        'locked_until', v_locked_until,
        'lockout_level', v_new_level,
        'duration_seconds', v_lockout_durations[v_new_level]
      );
    END IF;
  ELSE
    UPDATE public.profiles
    SET login_attempts = v_new_attempts, updated_at = NOW()
    WHERE id = user_id;
    RETURN jsonb_build_object(
      'status', 'ATTEMPT_RECORDED',
      'attempts', v_new_attempts,
      'remaining', 3 - v_new_attempts
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Rate Limit 상태 확인
CREATE OR REPLACE FUNCTION public.check_rate_limit(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT login_attempts, lockout_level, locked_until, is_locked
  INTO v_profile
  FROM public.profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'USER_NOT_FOUND');
  END IF;

  IF v_profile.is_locked THEN
    RETURN jsonb_build_object('allowed', FALSE, 'status', 'PERMANENTLY_LOCKED');
  END IF;

  IF v_profile.locked_until IS NOT NULL AND v_profile.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'status', 'TEMPORARILY_LOCKED',
      'locked_until', v_profile.locked_until,
      'remaining_seconds', EXTRACT(EPOCH FROM (v_profile.locked_until - NOW()))::INTEGER
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'status', 'OK',
    'attempts', v_profile.login_attempts,
    'remaining', 3 - v_profile.login_attempts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 로그인 성공 기록
CREATE OR REPLACE FUNCTION public.record_successful_login(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET login_attempts = 0, lockout_level = 0, locked_until = NULL, updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: RLS 정책 (비활성화)
-- ============================================
-- 참고: 이 앱은 Service Role Key를 사용하므로 RLS가 bypass됨
-- 필요시 아래 정책들을 활성화할 수 있음

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 설정 완료!
-- ============================================
```

---

## 2. 테이블 생성

개별적으로 실행하려면 아래 SQL들을 순서대로 실행하세요.

### 2.1 profiles 테이블

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '사용자',
  pin_hash TEXT NOT NULL,
  login_attempts INTEGER NOT NULL DEFAULT 0,
  lockout_level INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 courses 테이블

```sql
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  holes JSONB NOT NULL DEFAULT '[]',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 companions 테이블

```sql
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
```

### 2.4 rounds 테이블

```sql
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
```

### 2.5 round_players 테이블

```sql
CREATE TABLE IF NOT EXISTS public.round_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  companion_id UUID REFERENCES public.companions(id) ON DELETE SET NULL,
  is_owner BOOLEAN DEFAULT FALSE,
  player_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.6 scores 테이블

```sql
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_player_id UUID NOT NULL REFERENCES public.round_players(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  strokes INTEGER NOT NULL CHECK (strokes > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_player_id, hole_number)
);
```

---

## 3. 인덱스 생성

```sql
CREATE INDEX IF NOT EXISTS idx_courses_user ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_favorite ON public.courses(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_companions_user ON public.companions(user_id);
CREATE INDEX IF NOT EXISTS idx_companions_name ON public.companions(user_id, name);
CREATE INDEX IF NOT EXISTS idx_rounds_user_date ON public.rounds(user_id, play_date DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON public.rounds(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_local_id ON public.rounds(local_id) WHERE local_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_round_players_round ON public.round_players(round_id);
CREATE INDEX IF NOT EXISTS idx_scores_player ON public.scores(round_player_id);
CREATE INDEX IF NOT EXISTS idx_profiles_locked ON public.profiles(is_locked) WHERE is_locked = TRUE;
```

---

## 4. 트리거 및 함수

```sql
-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_companions_updated_at ON public.companions;
CREATE TRIGGER update_companions_updated_at
  BEFORE UPDATE ON public.companions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rounds_updated_at ON public.rounds;
CREATE TRIGGER update_rounds_updated_at
  BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scores_updated_at ON public.scores;
CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 5. 비즈니스 로직 함수

[PART 4 전체 함수 - 위의 전체 SQL에서 복사]

---

## 6. Rate Limiting 함수

[PART 5 전체 함수 - 위의 전체 SQL에서 복사]

---

## 7. RLS 정책

### 현재 설정 (비활성화)

이 앱은 서버에서 Service Role Key를 사용하므로 RLS가 bypass됩니다.

```sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores DISABLE ROW LEVEL SECURITY;
```

### RLS 활성화하려면 (선택사항)

추후 멀티 사용자 지원이나 추가 보안이 필요할 경우:

```sql
-- RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- profiles: 본인만 접근
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- courses: 소유자만 접근
CREATE POLICY "Users can manage own courses"
  ON public.courses FOR ALL
  USING (user_id = auth.uid());

-- companions: 소유자만 접근
CREATE POLICY "Users can manage own companions"
  ON public.companions FOR ALL
  USING (user_id = auth.uid());

-- rounds: 소유자만 접근
CREATE POLICY "Users can manage own rounds"
  ON public.rounds FOR ALL
  USING (user_id = auth.uid());

-- round_players: 라운드 소유자만 접근
CREATE POLICY "Users can manage own round players"
  ON public.round_players FOR ALL
  USING (
    round_id IN (
      SELECT id FROM public.rounds WHERE user_id = auth.uid()
    )
  );

-- scores: 라운드 참가자의 소유자만 접근
CREATE POLICY "Users can manage own scores"
  ON public.scores FOR ALL
  USING (
    round_player_id IN (
      SELECT rp.id FROM public.round_players rp
      JOIN public.rounds r ON rp.round_id = r.id
      WHERE r.user_id = auth.uid()
    )
  );
```

---

## 8. 초기 데이터 (선택)

첫 번째 사용자 생성 (앱에서 자동 생성됨, 수동 생성 필요 없음):

```sql
-- 수동으로 사용자를 생성하려면 (선택):
-- 초기 PIN은 앱에서 0000으로 설정됨
INSERT INTO public.profiles (id, name, pin_hash)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',  -- .dev.vars의 DEFAULT_USER_ID와 일치
  '사용자',
  'initial_hash_will_be_replaced'  -- 앱에서 새 PIN 설정시 업데이트됨
);
```

---

## 관리자 명령어

### 사용자 잠금 해제

```sql
SELECT reset_login_state('사용자-UUID-여기에');
```

### 사용자 통계 조회

```sql
SELECT * FROM get_user_stats('사용자-UUID-여기에');
```

### 동반자 통계 조회

```sql
SELECT * FROM get_companions_with_stats('사용자-UUID-여기에');
```

### 라운드 상세 조회

```sql
SELECT * FROM get_round_detail('라운드-UUID-여기에');
```

---

## 테이블 구조 다이어그램

```
profiles
├── id (PK)
├── name
├── pin_hash
├── login_attempts
├── lockout_level
├── locked_until
├── is_locked
├── created_at
└── updated_at

courses
├── id (PK)
├── user_id (FK → profiles)
├── name
├── holes (JSONB)
├── is_favorite
├── created_at
└── updated_at

companions
├── id (PK)
├── user_id (FK → profiles)
├── name
├── nickname
├── photo_url
├── is_favorite
├── created_at
└── updated_at

rounds
├── id (PK)
├── user_id (FK → profiles)
├── course_id (FK → courses)
├── play_date
├── tee_time
├── status
├── local_id
├── sync_status
├── created_at
└── updated_at

round_players
├── id (PK)
├── round_id (FK → rounds)
├── companion_id (FK → companions)
├── is_owner
├── player_order
└── created_at

scores
├── id (PK)
├── round_player_id (FK → round_players)
├── hole_number
├── strokes
├── created_at
└── updated_at
```
