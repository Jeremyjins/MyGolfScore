# My Golf Score App - Design Specification

> **작성일:** 2026-01-17
> **상태:** 설계 완료, 구현 대기

---

## 📁 File Structure

```
app/
├── routes/
│   ├── _index.tsx              # 루트 리다이렉트
│   ├── _layout.tsx             # 공통 레이아웃 (Bottom Nav)
│   ├── _layout.home.tsx        # /home
│   ├── _layout.history.tsx     # /history
│   ├── _layout.history.$id.tsx # /history/:id
│   ├── _layout.stats.tsx       # /stats
│   ├── _layout.companions.tsx  # /companions
│   ├── _layout.companions.$id.tsx
│   ├── _layout.courses.tsx     # /courses
│   ├── _layout.settings.tsx    # /settings
│   ├── login.tsx               # /login
│   ├── round.new.tsx           # /round/new
│   └── round.$id.tsx           # /round/:id
├── components/
│   ├── ui/                     # shadcn/ui
│   ├── layout/                 # bottom-nav, header, page-container
│   ├── auth/                   # pin-pad
│   ├── round/                  # score-table, score-cell, score-input-sheet
│   ├── history/                # round-card, round-list
│   ├── stats/                  # stat-card, charts
│   ├── companion/              # companion-card, companion-form
│   └── course/                 # course-card, course-form, par-input
├── lib/
│   ├── supabase.server.ts
│   ├── auth.server.ts
│   ├── errors.ts
│   ├── utils.ts
│   └── score-utils.ts
├── hooks/
│   ├── use-offline-sync.ts
│   ├── use-local-storage.ts
│   └── use-score-input.ts
├── types/
│   ├── database.ts
│   └── index.ts
└── contexts/
    └── sync-context.tsx
```

---

## 🗄️ Database Schema

### Tables
```sql
-- profiles: 사용자 (단일)
-- courses: 골프 코스 (name, holes JSONB, total_par, is_favorite)
-- companions: 동반자 (name, nickname, photo_url, is_favorite)
-- rounds: 라운드 (course_id, play_date, tee_time, status, local_id, sync_status)
-- round_players: 참가자 (round_id, companion_id, is_owner, player_order)
-- scores: 스코어 (round_player_id, hole_number, strokes)
```

### RLS Strategy
MVP: RLS 비활성화, Service Role Key로 서버에서만 접근

---

## 🔌 API Design

### Loader Pattern
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuth(request);
  const { data } = await supabase.from('table').select('*').eq('user_id', userId);
  return { data };
}
```

### Action Pattern
```typescript
export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');
  
  switch (intent) {
    case 'create': /* ... */
    case 'update': /* ... */
    case 'delete': /* ... */
  }
}
```

### Error Handling
- AppError 클래스 (code, status)
- ErrorBoundary 컴포넌트
- Supabase 에러 매핑

---

## 📦 Dependencies

### shadcn/ui Components
- button, card, input, badge, separator
- tabs, sheet (bottom sheet)
- form, label, calendar, popover
- alert, toast, skeleton
- table, avatar, scroll-area
- dialog, dropdown-menu, toggle

### NPM Packages
```json
{
  "@supabase/supabase-js": "^2.x",
  "date-fns": "^3.x",
  "recharts": "^2.x",
  "zod": "^3.x",
  "bcryptjs": "^2.x",
  "nanoid": "^5.x"
}
```

---

## 🔄 State Management

1. **Server State**: React Router loader/action
2. **UI State**: useState/useReducer
3. **Persistent State**: LocalStorage
4. **Global State**: SyncContext (오프라인 동기화)

---

## 📋 Implementation Checklist

```
□ 1. Supabase 마이그레이션 실행
□ 2. npm 의존성 설치
□ 3. shadcn/ui 컴포넌트 추가
□ 4. 타입 정의 파일 생성
□ 5. Supabase 클라이언트 설정
□ 6. routes.ts 구성
□ 7. 로그인 페이지 + PIN 패드
□ 8. 공통 레이아웃 + Bottom Nav
□ 9. 코스 등록/관리
□ 10. 동반자 등록/관리
□ 11. 라운드 시작 마법사
□ 12. 스코어 기록 화면
□ 13. 라운딩 히스토리
□ 14. 홈 대시보드
□ 15. LocalStorage 동기화
□ 16. 테스트 & 버그 수정
```
