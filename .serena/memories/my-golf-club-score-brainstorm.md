# 클럽스코어 기록 Feature - 브레인스토밍 결과

> 작성일: 2026-01-28
> 상태: 브레인스토밍 완료, 구현 대기

## 확정된 요구사항

| 항목 | 결정 |
|------|------|
| 기본 입력 모드 | 일반 입력 (클럽 입력은 토글 전환) |
| 기존 스코어 처리 | 추후 클럽 정보 추가 가능 |
| 아이콘/이미지 | 텍스트로 시작, 나중에 추가 |

## 통계 요구사항

### history.$id.tsx (라운드 상세)
- 라운드 평균 퍼팅 수: `1.8퍼트/홀`
- 퍼팅 분포: `1퍼트(4) 2퍼트(10) 3퍼트(3) 4퍼트+(1)`
- 클럽별 사용회수: `DR:14 7I:8 PT:32 ...`
- 홀별 클럽 표시: 스코어 하단에 `DR→7I→W54→PT`

### stats.tsx (전체 통계)
- 18홀 기준 클럽별 평균 사용회수 (테이블)
- 전체 평균 퍼팅: `1.78퍼트/홀`
- 퍼팅 분포 비율: `1퍼트:22% 2퍼트:61% 3퍼트:14% 4퍼트+:3%`

## 데이터베이스 스키마

### 신규 테이블

```sql
-- 1. clubs (마스터 데이터)
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('DRIVER','WOOD','HYBRID','IRON','WEDGE','PUTTER')),
  sort_order INTEGER NOT NULL
);

-- 2. user_clubs (사용자 클럽 세트)
CREATE TABLE user_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, club_id)
);

-- 3. club_shots (샷별 클럽 기록)
CREATE TABLE club_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id),
  shot_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(score_id, shot_order)
);
```

### 클럽 시드 데이터 (26개)

| 카테고리 | 클럽 코드 | 한글명 |
|----------|-----------|--------|
| DRIVER | DR | 드라이버 |
| WOOD | 3W, 4W, 5W, 7W | 3번우드, 4번우드, 5번우드, 7번우드 |
| HYBRID | 3H, 4H, 5H, 6H | 3번하이브리드, 4번하이브리드, 5번하이브리드, 6번하이브리드 |
| IRON | 3I, 4I, 5I, 6I, 7I, 8I, 9I, PW | 3번아이언~9번아이언, 피칭웨지 |
| WEDGE | W48, W50, W52, W54, W56, W58, W60 | 48도~60도 웨지 |
| PUTTER | PT | 퍼터 |

### 신규 RPC 함수

| 함수명 | 용도 | 사용 위치 |
|--------|------|-----------|
| `get_round_club_stats(round_id)` | 라운드별 클럽/퍼팅 통계 | history.$id.tsx |
| `get_round_hole_clubs(round_id)` | 홀별 클럽 순서 | history.$id.tsx |
| `get_user_club_stats(user_id)` | 전체 클럽 통계 | stats.tsx |

## 컴포넌트 구조

### 신규 컴포넌트
- `app/components/club/club-selector.tsx` - 클럽 선택 토글 그리드 (설정용)
- `app/components/club/club-input-panel.tsx` - 클럽 스코어 입력 패널
- `app/components/club/club-display.tsx` - 홀별 클럽 표시 (읽기 전용)
- `app/components/stats/club-stats-section.tsx` - 클럽 통계 섹션

### 수정할 파일
- `score-input-sheet.tsx` - 일반/클럽 입력 모드 토글 추가
- `_layout.settings.tsx` - "내 클럽" 섹션 추가
- `_layout.history.$id.tsx` - 클럽 통계 + 홀별 클럽 표시
- `_layout.stats.tsx` - 전체 클럽 통계 섹션 추가
- `database.ts` - 새 테이블 타입 추가

## 구현 Phase

### Phase 1: 데이터베이스
- clubs, user_clubs, club_shots 테이블 생성
- 26개 클럽 시드 데이터 삽입
- 인덱스 생성
- database.ts 타입 업데이트

### Phase 2: 클럽 관리 (Settings)
- ClubSelector 컴포넌트
- settings.server.ts 확장
- _layout.settings.tsx "내 클럽" 섹션

### Phase 3: 클럽 스코어 입력
- ClubInputPanel 컴포넌트
- ScoreInputSheet 모드 토글
- round.server.ts 확장 (club_shots 저장)
- 기존 스코어에 클럽 추가 기능

### Phase 4: 통계 표시
- 3개 RPC 함수 생성
- history.$id.tsx 클럽 통계/홀별 표시
- stats.tsx 전체 클럽 통계 섹션
