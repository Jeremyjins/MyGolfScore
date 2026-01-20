# 이메일 로그인 + 다중 사용자 구현 브레인스토밍

> **생성일**: 2026-01-20
> **목적**: PIN 기반 단일 사용자 → 이메일 기반 다중 사용자 전환

---

## 📊 현재 상태 vs 목표

| 항목 | 현재 | 목표 |
|------|------|------|
| **인증** | PIN 4자리 + 세션 쿠키 | 이메일/비밀번호 + Supabase Auth |
| **사용자** | 단일 사용자 | 다중 사용자 |
| **보안** | RLS 비활성화 | RLS 활성화 |
| **캐싱** | 없음 | TanStack Query |

---

## 🗄️ 데이터베이스 마이그레이션

### 1. profiles 테이블 변경

```sql
-- 제거할 컬럼: pin_hash, login_attempts, lockout_level, locked_until, is_locked
ALTER TABLE profiles
  DROP COLUMN IF EXISTS pin_hash,
  DROP COLUMN IF EXISTS login_attempts,
  DROP COLUMN IF EXISTS lockout_level,
  DROP COLUMN IF EXISTS locked_until,
  DROP COLUMN IF EXISTS is_locked;
```

### 2. 자동 프로필 생성 트리거

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', '사용자'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. 기존 데이터 마이그레이션

```sql
-- 새 사용자 UUID: fe010041-f90f-445d-91ac-ce8a69e00aef
-- 이메일: jeremyjins@gmail.com
DO $$
DECLARE
  old_id UUID;
  new_id UUID := 'fe010041-f90f-445d-91ac-ce8a69e00aef';
BEGIN
  SELECT id INTO old_id FROM profiles LIMIT 1;
  
  IF old_id IS NOT NULL AND old_id != new_id THEN
    UPDATE courses SET user_id = new_id WHERE user_id = old_id;
    UPDATE companions SET user_id = new_id WHERE user_id = old_id;
    UPDATE rounds SET user_id = new_id WHERE user_id = old_id;
    DELETE FROM profiles WHERE id = old_id;
  END IF;
  
  INSERT INTO profiles (id, name) 
  VALUES (new_id, '진대성')
  ON CONFLICT (id) DO UPDATE SET name = '진대성';
END $$;
```

### 4. RLS 정책

```sql
-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- courses, companions, rounds
CREATE POLICY "courses_all" ON courses FOR ALL USING (user_id = auth.uid());
CREATE POLICY "companions_all" ON companions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "rounds_all" ON rounds FOR ALL USING (user_id = auth.uid());

-- round_players
CREATE POLICY "round_players_all" ON round_players FOR ALL 
  USING (round_id IN (SELECT id FROM rounds WHERE user_id = auth.uid()));

-- scores
CREATE POLICY "scores_all" ON scores FOR ALL 
  USING (round_player_id IN (
    SELECT rp.id FROM round_players rp
    JOIN rounds r ON rp.round_id = r.id
    WHERE r.user_id = auth.uid()
  ));
```

---

## 🔐 인증 플로우

### 회원가입
1. 사용자가 이메일/비밀번호 입력
2. `supabase.auth.signUp()` 호출
3. 확인 이메일 발송 (선택적)
4. 트리거로 profiles 자동 생성

### 로그인
1. 사용자가 이메일/비밀번호 입력
2. `supabase.auth.signInWithPassword()` 호출
3. 세션 토큰 쿠키에 저장
4. 홈으로 리다이렉트

### 비밀번호 재설정
1. `resetPasswordForEmail()` 호출
2. 재설정 이메일 발송
3. 사용자가 링크 클릭 → `/auth/reset-password` 페이지
4. `updateUser({ password })` 호출

---

## 📦 TanStack Query 전략

### Query Keys
```typescript
export const queryKeys = {
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    stats: () => [...queryKeys.user.all, 'stats'] as const,
  },
  rounds: {
    all: ['rounds'] as const,
    list: () => [...queryKeys.rounds.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.rounds.all, 'detail', id] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: () => [...queryKeys.courses.all, 'list'] as const,
  },
  companions: {
    all: ['companions'] as const,
    withStats: () => [...queryKeys.companions.all, 'with-stats'] as const,
  },
};
```

### Caching Strategy
| 데이터 | staleTime | gcTime |
|--------|-----------|--------|
| User Profile | ∞ | 24h |
| Stats | 5min | 30min |
| Rounds List | 1min | 10min |
| Round Detail | 30s | 5min |
| Courses | 10min | 1h |
| Companions | 10min | 1h |

---

## 📁 파일 변경 계획

### 삭제
- `app/components/auth/pin-pad.tsx`
- `app/lib/rate-limit.server.ts`
- `app/lib/__tests__/rate-limit.server.test.ts`

### 신규 생성
- `app/lib/supabase.client.ts` - Browser client
- `app/lib/auth-context.tsx` - Auth state provider
- `app/routes/auth/login.tsx`
- `app/routes/auth/signup.tsx`
- `app/routes/auth/forgot-password.tsx`
- `app/routes/auth/reset-password.tsx`
- `app/routes/auth/callback.tsx`
- `app/queries/index.ts`
- `app/queries/user.ts`
- `app/queries/rounds.ts`
- `app/queries/courses.ts`
- `app/queries/companions.ts`

### 수정
- `app/lib/auth.server.ts` → Supabase session handling
- `app/lib/supabase.server.ts` → Auth helpers
- `app/routes/_layout.tsx` → QueryClientProvider
- `app/loaders/*.server.ts` → auth.uid() 사용
- `app/types/database.ts` → profiles 타입 변경

---

## 🚀 구현 Phase

### Phase 1: Database Migration
- [ ] Supabase에서 마이그레이션 SQL 실행
- [ ] 데이터 마이그레이션 확인

### Phase 2: Auth Infrastructure
- [ ] @tanstack/react-query, @supabase/ssr 설치
- [ ] Supabase client 설정
- [ ] Session management 구현

### Phase 3: Auth UI
- [ ] 로그인/회원가입 페이지
- [ ] 비밀번호 재설정 페이지

### Phase 4: Route Protection
- [ ] Layout auth 체크
- [ ] Loaders 업데이트

### Phase 5: TanStack Query
- [ ] QueryClientProvider 설정
- [ ] Query hooks 생성

### Phase 6: Cleanup
- [ ] PIN 관련 코드 제거
- [ ] 미사용 파일 삭제

---

## ⚠️ 주요 결정 사항

1. **profiles.id = auth.users.id**: Supabase best practice 따름
2. **기존 사용자**: `fe010041-f90f-445d-91ac-ce8a69e00aef` (jeremyjins@gmail.com)
3. **새 가입자**: 기존 데이터 접근 불가 (RLS로 격리)
4. **이름 표시**: `profile.name || '사용자'`

---

## 📌 관련 메모리
- `project-context` - 프로젝트 전체 구조
- `my-golf-supabase-setting` - 현재 DB 스키마
