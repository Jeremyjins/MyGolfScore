# 클럽 스코어 기록 기능 - 보안 및 성능 수정 완료

## 수정 일시
2026-01-28

## 적용된 보안 수정 사항

### 1. round.server.ts - updateScore 액션

**수정 내용:**
- UUID 형식 검증 함수 추가 (`isValidUUID`)
- `roundPlayerId` UUID 형식 검증
- `holeNumber` 범위 검증 (1-18)
- `strokes` 범위 검증 (1-99)
- `roundPlayerId` 소유권 검증 (Defense in Depth)
- `clubShotsJson` JSON 파싱 try-catch 추가
- `clubShots` 배열 및 각 항목 검증

**위치:** `app/loaders/round.server.ts:137-194`

### 2. settings.server.ts - toggleClub 액션

**수정 내용:**
- `clubId` UUID 형식 검증
- `action` 화이트리스트 검증 ('add', 'remove')

**위치:** `app/loaders/settings.server.ts:66-82`

### 3. RPC 함수 보안 강화 (마이그레이션 파일)

**신규 파일:** `supabase/migrations/20260128_clubs_security_fix.sql`

**수정 내용:**
1. `get_round_club_stats(p_round_id)`:
   - `auth.uid()` 인증 확인
   - 라운드 소유권 검증 추가
   - `SECURITY DEFINER` 명시

2. `get_round_hole_clubs(p_round_id)`:
   - `auth.uid()` 인증 확인
   - 라운드 소유권 검증 추가
   - `SECURITY DEFINER` 명시

3. `get_user_club_stats()` (파라미터 없는 버전 추가):
   - `auth.uid()` 직접 사용
   - 인증 확인

4. `get_user_club_stats(p_user_id)` (기존 버전 유지):
   - `auth.uid()` 와 파라미터 일치 확인
   - 다른 사용자 통계 접근 차단

### 4. 추가 인덱스 (성능 최적화)

```sql
CREATE INDEX IF NOT EXISTS idx_club_shots_score_club ON public.club_shots(score_id, club_id);
CREATE INDEX IF NOT EXISTS idx_round_players_round_owner ON public.round_players(round_id, is_owner);
```

## 실행 필요 사항

Supabase Dashboard에서 다음 마이그레이션 실행 필요:
- `supabase/migrations/20260128_clubs_security_fix.sql`

## 해결된 취약점 목록

| 심각도 | 파일 | 취약점 | 상태 |
|--------|------|--------|------|
| 높음 | round.server.ts | roundPlayerId 소유권 미검증 | ✅ 해결됨 |
| 높음 | 20260128_clubs.sql | RPC에서 라운드 소유권 미검증 | ✅ 해결됨 |
| 중간 | round.server.ts | clubShotsJson 파싱 예외처리 없음 | ✅ 해결됨 |
| 중간 | round.server.ts | 입력값 범위 검증 없음 | ✅ 해결됨 |
| 낮음 | settings.server.ts | clubId UUID 형식 미검증 | ✅ 해결됨 |
| 낮음 | settings.server.ts | action 화이트리스트 미검증 | ✅ 해결됨 |

---

## 성능 최적화 적용 사항

### 1. RPC 함수 CTE 최적화

**get_round_club_stats:**
- 기존: 18개 correlated subquery (홀당 1개)
- 개선: 3개 CTE 기반 단일 스캔
- 예상 성능 향상: 6-10배

**get_user_club_stats:**
- 기존: 다중 테이블 반복 스캔 + correlated subquery
- 개선: completed_scores CTE 기반 단일 데이터셋 재사용
- 예상 성능 향상: 10배 이상 (대용량 데이터에서)

### 2. stats.server.ts 쿼리 병렬화

- 기존: 2개 RPC 병렬 + 1개 rounds 쿼리 순차
- 개선: 3개 쿼리 모두 병렬 (Promise.all)
- 예상 성능 향상: 30-50% 응답 시간 감소

### 3. 추가 인덱스

```sql
CREATE INDEX idx_club_shots_score_club ON club_shots(score_id, club_id);
CREATE INDEX idx_round_players_round_owner ON round_players(round_id, is_owner);
```

| 심각도 | 파일 | 병목 | 상태 |
|--------|------|------|------|
| 높음 | RPC 함수 | correlated subquery | ✅ CTE로 최적화 |
| 중간 | stats.server.ts | 순차 쿼리 | ✅ 병렬화 완료 |
| 중간 | 인덱스 | 복합 인덱스 누락 | ✅ 추가됨 |
