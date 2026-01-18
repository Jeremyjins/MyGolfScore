# My Golf Score App - 디자인 개선 브레인스토밍

**Date**: 2026-01-18
**Status**: 분석 완료, 구현 대기

---

## 📊 현재 디자인 분석 결과

### 1. 색상 시스템 문제 (Priority: HIGH)

**현재 상태:**
- Primary: `oklch(0.65 0.2 130)` (Lime)
- Primary-foreground: `oklch(0.145 0 0)` (검정)

**문제점:**
- Lime 배경에 검정 텍스트 = 시인성 저하, 답답한 느낌
- 밝은 배경에 어두운 텍스트 조합이 모던하지 않음

**개선안:**
```css
/* Light Mode */
--primary: oklch(0.55 0.2 130);        /* 더 진한 Lime */
--primary-foreground: oklch(1 0 0);    /* 흰색 텍스트 */

/* Dark Mode */  
--primary: oklch(0.65 0.18 130);       /* 밝은 Lime */
--primary-foreground: oklch(0.1 0 0);  /* 어두운 텍스트 */
```

---

### 2. Bottom Navigation 문제 (Priority: HIGH)

**현재 상태:**
- 중앙 "시작" 버튼이 FAB(Floating Action Button) 스타일
- 네비게이션 바를 침범하는 원형 버튼
- 아이콘 스타일 불일치 (시작만 filled, 나머지 outlined)

**문제점:**
- 다른 네비게이션 앱들과 패턴 불일치
- FAB가 어색하게 튀어나옴
- 활성 탭 표시가 너무 subtle (텍스트 색상만 변경)

**개선안:**
- Option A: FAB 제거 → 플랫 네비게이션으로 통일
- Option B: 활성 탭에 배경 pill 추가 (iOS 스타일)
- Option C: 상단 indicator bar 추가

**권장:** Option A (플랫 네비게이션)

---

### 3. Stats 카드 문제 (Priority: MEDIUM)

**현재 상태:**
- 4개 Stats 카드 (핸디캡, 베스트, 평균 스코어, 총 라운드)
- 일부만 아이콘 있음 (핸디캡, 베스트)
- 높이 불균형, 숫자가 시각적으로 약함

**개선안:**
- 모든 카드 아이콘 통일 (있거나 없거나)
- min-height: 100px 고정
- 숫자: font-size 28px, font-weight 700
- 라벨: font-size 12px, muted color

---

### 4. 간격 시스템 문제 (Priority: MEDIUM)

**현재 상태:**
- 불규칙한 margin/padding
- 컴포넌트 간 여백 불일관

**개선안 - 8px 기반 시스템:**
```
8px  - 아이콘-텍스트 간격
12px - 작은 컴포넌트 간 gap
16px - 카드 내부 padding
24px - 섹션 간격
32px - 페이지 상하 margin
```

---

### 5. 타이포그래피 문제 (Priority: MEDIUM)

**현재 상태:**
- 인사말 제목이 너무 굵고 큼
- 본문/라벨 계층 불명확

**개선안 - 타이포그래피 스케일:**
```
12px - Caption, 라벨
14px - Body small
16px - Body
20px - Heading 3
24px - Heading 2
32px - Heading 1
```

**Font Weight:**
- 제목: font-semibold (600)
- 본문: font-normal (400)
- 숫자: font-bold (700)

---

### 6. 카드/컴포넌트 스타일 (Priority: LOW)

**현재 상태:**
- 모든 카드 동일 radius (약 10px)
- 그림자 없거나 너무 subtle
- 버튼 높이 불일관

**개선안:**
- 카드 radius: 16px (더 모던함)
- 버튼: h-12 (48px) 고정
- 메인 CTA에 subtle shadow 추가

---

## 🚀 구현 우선순위

| 순위 | 작업 | 파일 | 예상 효과 |
|:----:|------|------|----------|
| 1 | 색상 시스템 수정 | `app/app.css` | 시인성 대폭 향상 |
| 2 | Bottom Nav 개선 | `app/routes/_layout.tsx` | 일관성, 모던함 |
| 3 | Stats 카드 통일 | `app/routes/_layout.home.tsx` | 깔끔한 대시보드 |
| 4 | 간격 정리 | 여러 컴포넌트 | 전체적 완성도 |
| 5 | 타이포 개선 | `app/app.css` + 컴포넌트 | 가독성 향상 |

---

## 🎨 디자인 시스템 키워드

- **Clean**: 불필요한 장식 제거
- **Consistent**: 일관된 간격/색상/타이포
- **Accessible**: WCAG AA 대비율 준수
- **Modern**: 부드러운 radius, subtle shadows

---

## 📁 관련 파일

- `app/app.css` - CSS 변수 및 테마
- `app/routes/_layout.tsx` - Bottom Navigation
- `app/routes/_layout.home.tsx` - 홈 페이지
- `app/components/layout/` - 공통 레이아웃 컴포넌트

---

## 🔗 스크린샷 참조

- `.playwright-mcp/current-design-analysis.png` - 홈 페이지
- `.playwright-mcp/round-new-page.png` - 라운드 시작 페이지
- `.playwright-mcp/companions-page.png` - 동반자 페이지
