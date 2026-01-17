-- Rate Limiting for Login Security
-- Migration: 20260118000001_add_rate_limiting

-- ============================================
-- Add rate limiting columns to profiles table
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lockout_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================
-- Rate Limiting Logic Documentation
-- ============================================
-- login_attempts: Failed attempts in current lockout phase (0-2, resets to 0 after lockout)
-- lockout_level: Progression of lockouts (0-4)
--   Level 0: No lockout (initial state)
--   Level 1: 10 minutes lockout (after 3 failed attempts)
--   Level 2: 1 hour lockout (after 3 more failed attempts)
--   Level 3: 6 hours lockout (after 3 more failed attempts)
--   Level 4: Permanent lock (is_locked = true)
-- locked_until: Timestamp when current temporary lockout expires
-- is_locked: Permanent lock flag, requires manual reset

-- ============================================
-- Helper function to reset login state
-- Called when admin unlocks a user
-- ============================================
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

-- ============================================
-- Function to record failed login attempt
-- Returns: lockout_info JSONB with status
-- ============================================
CREATE OR REPLACE FUNCTION public.record_failed_login(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_new_attempts INTEGER;
  v_new_level INTEGER;
  v_lockout_durations INTEGER[] := ARRAY[600, 3600, 21600]; -- 10min, 1hr, 6hr in seconds
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Get current state
  SELECT login_attempts, lockout_level, locked_until, is_locked
  INTO v_profile
  FROM public.profiles
  WHERE id = user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'USER_NOT_FOUND');
  END IF;

  -- Check if permanently locked
  IF v_profile.is_locked THEN
    RETURN jsonb_build_object('status', 'PERMANENTLY_LOCKED');
  END IF;

  -- Increment attempts
  v_new_attempts := v_profile.login_attempts + 1;

  IF v_new_attempts >= 3 THEN
    -- Advance lockout level
    v_new_level := v_profile.lockout_level + 1;

    IF v_new_level >= 4 THEN
      -- Permanent lock
      UPDATE public.profiles
      SET
        login_attempts = 0,
        lockout_level = 4,
        is_locked = TRUE,
        updated_at = NOW()
      WHERE id = user_id;

      RETURN jsonb_build_object('status', 'PERMANENTLY_LOCKED');
    ELSE
      -- Temporary lockout
      v_locked_until := NOW() + (v_lockout_durations[v_new_level] || ' seconds')::INTERVAL;

      UPDATE public.profiles
      SET
        login_attempts = 0,
        lockout_level = v_new_level,
        locked_until = v_locked_until,
        updated_at = NOW()
      WHERE id = user_id;

      RETURN jsonb_build_object(
        'status', 'TEMPORARILY_LOCKED',
        'locked_until', v_locked_until,
        'lockout_level', v_new_level,
        'duration_seconds', v_lockout_durations[v_new_level]
      );
    END IF;
  ELSE
    -- Just increment attempts
    UPDATE public.profiles
    SET
      login_attempts = v_new_attempts,
      updated_at = NOW()
    WHERE id = user_id;

    RETURN jsonb_build_object(
      'status', 'ATTEMPT_RECORDED',
      'attempts', v_new_attempts,
      'remaining', 3 - v_new_attempts
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to check login rate limit status
-- ============================================
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

  -- Check permanent lock
  IF v_profile.is_locked THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'status', 'PERMANENTLY_LOCKED'
    );
  END IF;

  -- Check temporary lockout
  IF v_profile.locked_until IS NOT NULL AND v_profile.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'status', 'TEMPORARILY_LOCKED',
      'locked_until', v_profile.locked_until,
      'remaining_seconds', EXTRACT(EPOCH FROM (v_profile.locked_until - NOW()))::INTEGER
    );
  END IF;

  -- Allowed to attempt
  RETURN jsonb_build_object(
    'allowed', TRUE,
    'status', 'OK',
    'attempts', v_profile.login_attempts,
    'remaining', 3 - v_profile.login_attempts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to reset on successful login
-- ============================================
CREATE OR REPLACE FUNCTION public.record_successful_login(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    login_attempts = 0,
    lockout_level = 0,
    locked_until = NULL,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Index for locked users (for admin queries)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_locked ON public.profiles(is_locked) WHERE is_locked = TRUE;

-- ============================================
-- Comment for documentation
-- ============================================
COMMENT ON COLUMN public.profiles.login_attempts IS '현재 잠금 단계의 실패한 로그인 시도 횟수 (0-2)';
COMMENT ON COLUMN public.profiles.lockout_level IS '잠금 진행 단계 (0: 없음, 1: 10분, 2: 1시간, 3: 6시간, 4: 영구잠금)';
COMMENT ON COLUMN public.profiles.locked_until IS '임시 잠금 해제 시간';
COMMENT ON COLUMN public.profiles.is_locked IS '영구 잠금 여부 (관리자가 직접 해제 필요)';
