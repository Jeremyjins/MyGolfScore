# My Golf App - 개선 2차 세션 기록

## 세션 일시
- 2026-01-19

## 작업 내용 요약

### 1. 스코어 분포 차트 컴포넌트 리팩토링

#### 변경 사항
- **공통 컴포넌트 생성**: `app/components/charts/score-distribution-chart.tsx`
  - `ScoreDistribution` 인터페이스 정의
  - `height`, `compact` props로 다양한 화면 대응
  - 색상 매핑, 라벨, 차트 설정 캡슐화

#### 적용 페이지
1. **stats 페이지** (`_layout.stats.tsx`)
   - `BarChart`, `Bar`, `Cell` import 제거
   - `distributionChartConfig`, `getScoreColor`, `distributionLabels` 제거
   - `barChartData` 계산 로직 제거 (약 56줄)

2. **home 페이지** (`_layout.home.tsx`)
   - 동일한 중복 코드 제거 (약 80줄)
   - stats 페이지와 동일한 디자인 적용 (height: 220)

3. **companions 페이지** (`_layout.companions.$id.tsx`)
   - 동일한 중복 코드 제거 (약 80줄)

#### 결과
- 약 200줄 이상의 중복 코드 제거
- 유지보수성 향상

---

### 2. Recharts 경고 수정

#### 문제
```
The width(-1) and height(-1) of chart should be greater than 0
```

#### 원인 분석
- `ChartContainer`의 `ResponsiveContainer`가 초기 렌더링 시 부모 크기를 감지 못함
- `aspect-video` 클래스와 `style={{ height }}` 충돌

#### 해결 (`app/components/ui/chart.tsx`)
1. `aspect-video` 클래스 제거 (height 스타일과 충돌 방지)
2. `ResponsiveContainer`에 명시적 props 추가:
   ```tsx
   <ResponsiveContainer width="100%" height="100%" minWidth={0}>
     {children}
   </ResponsiveContainer>
   ```

---

## 기술적 인사이트

### Recharts ResponsiveContainer 베스트 프랙티스
- 항상 `width="100%"` `height="100%"` 명시
- `minWidth={0}` 추가로 flexbox 환경 지원
- 부모 컨테이너에 명시적인 높이 필요

### 차트 컴포넌트 설계 패턴
- 데이터 변환 로직은 컴포넌트 내부에서 처리
- props로 원본 데이터와 설정값만 전달
- `compact` 모드로 다양한 레이아웃 지원

---

## 파일 변경 목록

### 신규 생성
- `app/components/charts/score-distribution-chart.tsx`

### 수정됨
- `app/routes/_layout.stats.tsx` - 공통 컴포넌트 적용
- `app/routes/_layout.home.tsx` - 공통 컴포넌트 적용
- `app/routes/_layout.companions.$id.tsx` - 공통 컴포넌트 적용
- `app/components/ui/chart.tsx` - ResponsiveContainer 경고 수정

---

## 다음 세션을 위한 참고사항

### 차트 관련
- 새로운 차트 추가 시 `ChartContainer` 사용
- 높이는 반드시 부모 요소나 style prop으로 지정
- 반응형 필요시 className으로 조절

### 코드 품질
- 중복 코드 발견 시 공통 컴포넌트로 추출 권장
- 차트 컴포넌트는 `app/components/charts/` 디렉토리에 위치
