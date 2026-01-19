# My Golf Score App - 전반적 개선 3차

## 세션 날짜
2026-01-19

## 개선 요약

### 1. ScoreTrendChart 공통 컴포넌트 생성
- **파일**: `app/components/charts/score-trend-chart.tsx`
- stats 페이지의 스코어 추이 차트를 컴포넌트로 추출
- home과 stats 페이지에서 동일한 컴포넌트 사용
- Props: `roundHistory`, `height`, `showLegend`, `className`

### 2. Home/Stats 데이터 일관성 수정
- **파일**: `app/loaders/home.server.ts`
- roundHistory 쿼리 limit을 10에서 50으로 변경
- stats와 동일한 데이터를 표시하도록 수정

### 3. 스코어 입력 패널 버튼 개선
- **파일**: `app/components/score/score-input-sheet.tsx`
- 이글(-2) 제거, 쿼드러플보기(+4) 추가
- 새 버튼 배치:
  - 상단: -1(버디), 0(파), +1(보기)
  - 하단: +2(더블보기), +3(트리플보기), +4(쿼드러플보기)

### 4. 라운드 시작 세팅 페이지 개선

#### 4.1 TimePicker 시간 옵션 수정
- **파일**: `app/components/ui/time-picker.tsx`
- 6:00, 6:30 삭제
- 12:00, 12:30, 13:00, 13:30, 14:00 추가
- 기본값 08:00 설정

#### 4.2 CourseCombobox 컴포넌트 생성
- **파일**: `app/components/course/course-combobox.tsx`
- shadcn Command 기반 검색 가능한 콤보박스
- 코스 이름 검색, 즐겨찾기 우선 정렬

#### 4.3 CompanionMultiSelect 컴포넌트 생성
- **파일**: `app/components/companion/companion-multi-select.tsx`
- shadcn Command 기반 다중 선택
- Badge로 선택된 동반자 표시, X 버튼으로 제거 가능
- 최대 3명 제한

#### 4.4 round.new.tsx 업데이트
- CourseCombobox, CompanionMultiSelect 적용
- Card 레이아웃으로 UI 개선

### 5. PWA App Icon 설정
- **파일**: `app/root.tsx`
- manifest.json 링크 추가
- apple-touch-icon 추가 (여러 사이즈)
- PWA 메타 태그 추가:
  - theme-color
  - apple-mobile-web-app-capable
  - apple-mobile-web-app-status-bar-style
  - apple-mobile-web-app-title
- lang="ko", viewport-fit=cover 추가

### 6. 아이콘 추가
- **파일**: `app/components/ui/icons.tsx`
- ChevronsUpDownIcon, XIcon 추가

## 새로 생성된 파일
1. `app/components/charts/score-trend-chart.tsx`
2. `app/components/course/course-combobox.tsx`
3. `app/components/companion/companion-multi-select.tsx`
4. `app/components/ui/command.tsx` (shadcn 설치)

## 수정된 파일
1. `app/routes/_layout.stats.tsx` - ScoreTrendChart 적용
2. `app/routes/_layout.home.tsx` - ScoreTrendChart 적용
3. `app/loaders/home.server.ts` - limit 50으로 변경
4. `app/components/score/score-input-sheet.tsx` - 버튼 옵션 변경
5. `app/components/ui/time-picker.tsx` - 시간 옵션 수정
6. `app/routes/round.new.tsx` - 새 컴포넌트 적용
7. `app/components/ui/icons.tsx` - 아이콘 추가
8. `app/root.tsx` - PWA 설정 추가

## 기술 스택
- shadcn/ui Command 컴포넌트 (cmdk 기반)
- Popover + Command 조합으로 검색 가능한 셀렉터 구현
- PWA manifest.json + apple-touch-icon으로 홈화면 아이콘 지원

## 알려진 이슈
- `app/components/charts/score-distribution-chart.tsx`에 타입 에러 존재 (기존 이슈, 이번 세션과 무관)
