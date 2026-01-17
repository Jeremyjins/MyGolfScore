# My Golf Score App - 구현 계획

> **작성일:** 2026-01-17
> **설명:** 구현계획 수립

---

## 🎯 MVP 구현 범위

### 핵심 기능
1. PIN 로그인 (4자리 + 자동 로그인)
2. 홈 대시보드 (시작 버튼 + 최근 성적)
3. 코스 등록/관리
4. 동반자 등록/관리
5. 라운드 시작 (3단계 마법사)
6. 스코어 기록 (Bottom Sheet 방식)
7. 라운딩 히스토리
8. LocalStorage + Supabase 동기화

---

## 📋 구현 단계 (16 Steps)

### Phase 1-A: 기반 설정
```
□ Step 1: Supabase 마이그레이션 실행
   - profiles, courses, companions, rounds, round_players, scores 테이블
   - get_user_stats, get_companions_with_stats SQL 함수
   - 인덱스 생성

□ Step 2: npm 의존성 설치
   - @supabase/supabase-js
   - date-fns, zod, bcryptjs, nanoid
   - recharts (Phase 2용)

□ Step 3: shadcn/ui 컴포넌트 추가
   - button, card, input, badge, separator
   - tabs, sheet, form, label, calendar, popover
   - toast, skeleton, table, dialog, toggle

□ Step 4: 타입 정의 파일 생성
   - types/database.ts (Supabase 자동생성)
   - types/index.ts (엔티티 + Props 인터페이스)

□ Step 5: Supabase 클라이언트 설정
   - lib/supabase.server.ts
   - lib/auth.server.ts
   - lib/errors.ts

□ Step 6: routes.ts 구성
   - 라우트 설정 파일
```

### Phase 1-B: 인증 & 레이아웃
```
□ Step 7: 로그인 페이지 + PIN 패드
   - routes/login.tsx
   - components/auth/pin-pad.tsx
   - 세션 쿠키 관리

□ Step 8: 공통 레이아웃 + Bottom Nav
   - routes/_layout.tsx
   - components/layout/bottom-nav.tsx
   - components/layout/header.tsx
   - components/layout/page-container.tsx
```

### Phase 1-C: 데이터 관리
```
□ Step 9: 코스 등록/관리
   - routes/_layout.courses.tsx
   - components/course/course-form.tsx
   - components/course/course-card.tsx
   - components/course/par-input.tsx

□ Step 10: 동반자 등록/관리
   - routes/_layout.companions.tsx
   - components/companion/companion-form.tsx
   - components/companion/companion-card.tsx
```

### Phase 1-D: 핵심 기능
```
□ Step 11: 라운드 시작 마법사
   - routes/round.new.tsx
   - components/round/round-wizard/step-date.tsx
   - components/round/round-wizard/step-course.tsx
   - components/round/round-wizard/step-companions.tsx

□ Step 12: 스코어 기록 화면 ⭐ (핵심)
   - routes/round.$id.tsx
   - components/round/score-table.tsx
   - components/round/score-cell.tsx
   - components/round/score-input-sheet.tsx
   - components/round/hole-tabs.tsx

□ Step 13: 라운딩 히스토리
   - routes/_layout.history.tsx
   - routes/_layout.history.$id.tsx
   - components/history/round-card.tsx
   - components/history/round-list.tsx
```

### Phase 1-E: 완성
```
□ Step 14: 홈 대시보드
   - routes/_layout.home.tsx
   - 최근 성적 요약
   - Quick Start 기능

□ Step 15: LocalStorage 동기화
   - hooks/use-offline-sync.ts
   - hooks/use-local-storage.ts
   - contexts/sync-context.tsx

□ Step 16: 테스트 & 버그 수정
```

---

## 🔧 기술 결정 사항

### 인증
- 4자리 PIN (bcrypt 해시)
- 세션 쿠키 (httpOnly, SameSite=Lax)
- 자동 로그인: 30일 / 비자동: 1일

### 데이터 동기화
- Optimistic UI: 즉시 UI 업데이트
- LocalStorage: 변경사항 백업
- Supabase: 비동기 동기화

### 상태 관리
- 서버 상태: React Router loader/action
- UI 상태: useState/useReducer
- 전역 상태: SyncContext (오프라인용)

---

## 📁 관련 문서

- `my-golf-brainstorm.md` - 브레인스토밍 결과
- `my-golf-design-spec.md` - 상세 설계 문서

---

## ⏭️ 다음 단계

구현 시작 전 확인 필요:
1. Supabase 프로젝트 준비 여부
2. 환경변수 설정 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
3. 구현 우선순위 변경 여부
