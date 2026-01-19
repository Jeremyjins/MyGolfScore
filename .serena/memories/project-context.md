# My Golf Score App - Project Context

## 프로젝트 개요
**앱 이름**: My Golf Score (마이 골프 스코어)
**목적**: 개인 골프 라운드 스코어 기록 및 통계 관리 앱
**언어**: 한국어 (Korean)

---

## 기술 스택

### Frontend
- **Framework**: React Router 7 (File-based routing, v8_viteEnvironmentApi)
- **UI Library**: shadcn/ui (new-york style)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Font**: Noto Sans
- **Theme**: Orange primary color (`oklch(0.7 0.18 50)`)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Cloudflare Workers (Edge)
- **Auth**: 4-digit PIN login with session cookies

---

## 주요 기능

### 1. 홈 대시보드 (`/home`)
- 통계 카드 (핸디캡, 베스트, 평균, 총 라운드)
- 스코어 추이 차트
- 홀별 스코어 분포 차트
- 최근 라운드 목록
- 라운드 시작 버튼

### 2. 라운드 관리
- **라운드 시작** (`/round/new`): 날짜, 시간, 코스, 동반자 선택
- **스코어 입력** (`/round/:id`): 실시간 스코어 기록
- **라운드 히스토리** (`/history`): 월별 그룹화된 기록
- **라운드 상세** (`/history/:id`): 스코어카드 조회/수정

### 3. 코스 관리 (`/courses`)
- 18홀 코스 등록
- 홀별 파 설정
- 즐겨찾기 기능

### 4. 동반자 관리 (`/companions`)
- 동반자 등록/수정/삭제
- 동반자별 통계 (함께한 라운드, 평균 스코어)
- 즐겨찾기 기능

### 5. 통계 (`/stats`)
- 핸디캡 계산 (최근 20라운드 상위 40% 평균 × 0.96)
- 스코어 추이 차트
- 핸디캡 추이 차트
- 평균 스코어 추이 차트
- 홀별 스코어 분포

### 6. 설정 (`/settings`)
- 사용자 이름 변경
- 로그아웃

---

## 프로젝트 구조

```
app/
├── components/
│   ├── charts/
│   │   ├── score-distribution-chart.tsx
│   │   └── score-trend-chart.tsx
│   ├── companion/
│   │   ├── companion-card.tsx
│   │   └── companion-multi-select.tsx
│   ├── course/
│   │   ├── course-card.tsx
│   │   ├── course-combobox.tsx
│   │   └── par-input.tsx
│   ├── layout/
│   │   ├── bottom-nav.tsx
│   │   ├── header.tsx
│   │   └── page-container.tsx
│   ├── score/
│   │   ├── score-input-sheet.tsx
│   │   ├── score-table.tsx
│   │   └── vertical-score-table.tsx
│   ├── stats/
│   │   └── stats-cards.tsx
│   └── ui/ (shadcn components)
├── lib/
│   ├── auth.server.ts
│   ├── score-utils.ts
│   ├── supabase.server.ts
│   └── utils.ts
├── loaders/ (*.server.ts)
├── routes/
└── types/
```

---

## 아키텍처 패턴

### Server/Client 분리
- 모든 서버 코드는 `app/loaders/*.server.ts`에 위치
- Route에서 re-export 패턴 사용: `export { loader, action } from '~/loaders/xxx.server'`

### 컴포넌트 설계
- 공통 컴포넌트: `stats-cards.tsx`, `score-trend-chart.tsx`, `score-distribution-chart.tsx`
- shadcn Command 기반 검색 셀렉터: `course-combobox.tsx`, `companion-multi-select.tsx`

### 아이콘 시스템
- 중앙 집중식 관리: `app/components/ui/icons.tsx`
- lucide-react 사용

---

## 데이터베이스 스키마

### Tables
- `users` - 사용자 (PIN 해시 저장)
- `courses` - 골프 코스 (holes: JSONB)
- `companions` - 동반자
- `rounds` - 라운드 세션
- `round_players` - 라운드 참가자
- `scores` - 홀별 스코어

### RPC Functions
- `get_user_stats` - 사용자 통계 조회
- `get_companions_with_stats` - 동반자 + 통계 조회

---

## PWA 설정
- `public/manifest.json` - 앱 매니페스트
- `public/images/app_logo.png` - 앱 아이콘
- Apple Touch Icon, theme-color 등 메타 태그 설정

---

## 최근 개선 사항 (2026-01-19)

1. **ScoreTrendChart 공통 컴포넌트** - home/stats 공유
2. **CourseCombobox** - Command 기반 검색 가능한 코스 선택
3. **CompanionMultiSelect** - Command 기반 다중 동반자 선택
4. **스코어 입력 버튼 개선** - 이글 제거, +4 추가
5. **TimePicker 시간 옵션** - 7:00~14:00 범위로 조정
6. **PWA App Icon** - Safari 홈화면 추가 지원

---

## Git 최근 커밋
```
5c31c61 Start Round Setting Refactor
ce184dd Recent Scores Chart
3b496ea Score Input Refactor
5ac4b7f Stat Component Refactor
719cdf4 Time Input Mobile Refactor
5ad3748 Chart Refactor
30b8bad Course Handicap Change
8391fa6 Stat Refactor
9cd750f Recent Rounds Gap
cde6f1b Score Input Refactor
```

---

## 관련 메모리 파일
- `my-golf-supabase-setting` - Supabase 설정
- `my-golf-design-spec` - 설계 명세
- `my-golf-implement-complete` - 구현 완료 상태
- `my-golf-improvement-2` - 개선 2차
- `my-golf-improvement-3` - 개선 3차
