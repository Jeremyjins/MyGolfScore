# My Golf Score App - 브레인스토밍 세션

> **저장일시:** 2026-01-17
> **설명:** 브레인스토밍 완료

---

## 📱 프로젝트 개요

개인용 모바일 골프 스코어 기록 앱

### 기술 스택
- **Frontend:** React Router 7 + Vite 7 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (new-york style, hugeicons)
- **Theme:** Orange (oklch 0.7 0.18 50), Noto Sans 폰트
- **Backend:** Supabase (PostgreSQL)
- **Deploy:** Cloudflare Workers

---

## 🎯 핵심 UX 결정사항

### 1. 로그인
- **방식:** 4자리 PIN 숫자 패드
- **자동 로그인:** LocalStorage 기반 옵션 제공
- **이유:** 텍스트 비밀번호 대비 빠른 입력, 모바일 친화적

### 2. 네비게이션
- **방식:** Bottom Navigation (5개 탭)
- **구성:** 홈 | 기록 | 시작 | 동반자 | 설정
- **예외:** 스코어 기록 화면에서는 Bottom Nav 숨김

### 3. 스코어 입력
- **방식:** 셀 탭 → Bottom Sheet 숫자 선택
- **전환:** 탭 기반 OUT/IN 전환 (스크롤 아님)
- **색상 코딩:** 이글(금) / 버디(초록) / 파(중립) / 보기(주황) / 더블+(빨강)

### 4. 데이터 동기화
- **전략:** Optimistic UI + LocalStorage + Supabase 비동기 동기화
- **오프라인:** LocalStorage 즉시 저장, 네트워크 복구 시 동기화

---

## 🗄️ Supabase 스키마

```sql
-- users: 사용자 (단일 사용자)
-- courses: 골프 코스 (이름, 18홀 Par 정보)
-- companions: 동반자 (이름, 별명, 즐겨찾기)
-- rounds: 라운드 (날짜, 티타임, 코스, 상태)
-- round_players: 라운드 참가자 (본인 + 동반자 최대 3명)
-- scores: 홀별 스코어
```

### 관계
```
users ─┬─ courses
       ├─ companions
       └─ rounds ─── round_players ─── scores
```

---

## 📋 개발 Phase

### Phase 1: MVP
- PIN 로그인 (자동 로그인 옵션)
- 홈 화면 (시작 버튼 + 간단한 요약)
- 코스 등록 (이름 + Par)
- 라운드 시작 (날짜, 시간, 코스, 동반자)
- 스코어 기록 (Bottom Sheet 방식)
- 라운딩 히스토리 (기본 카드)
- LocalStorage + Supabase 동기화

### Phase 2: 핵심 확장
- 내 통계 (핸디캡, 평균, 분포)
- 동반자 상세 (개인 통계)
- 히스토리 필터/검색
- 즐겨찾기 (코스, 동반자)
- 트렌드 그래프

### Phase 3: 고급 기능
- 목표 설정
- 스코어카드 이미지 공유
- 다크모드
- 라운드 리마인더

### Phase 4: 미래 확장
- 코스 DB 연동
- 리더보드 (동반자 간)
- 고급 통계 (GIR, 퍼팅 등)

---

## 🖼️ 주요 화면 (11개)

1. 로그인 (PIN)
2. 홈 (대시보드)
3. 라운드 시작 (3단계 마법사)
4. 스코어 기록 (핵심)
5. 라운딩 히스토리
6. 라운딩 상세/편집
7. 내 통계
8. 동반자 리스트
9. 동반자 상세
10. 코스 관리
11. 설정

---

## 💡 핵심 UX 원칙

1. **골프장에서의 빠른 입력** - 모든 인터랙션 3초 이내
2. **한 손 조작 최적화** - Thumb Zone 고려
3. **오프라인 우선** - 네트워크 없어도 사용 가능
4. **시각적 피드백** - 색상 코딩, 애니메이션, Haptic

---

## ❓ 미결정 사항 (사용자 확인 필요)

1. 로그인 방식: 4자리 PIN으로 변경 동의?
2. Bottom Navigation 사용 동의?
3. 스코어 입력 Bottom Sheet 방식 동의?
4. MVP 범위 확정?
