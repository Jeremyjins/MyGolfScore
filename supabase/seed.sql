-- My Golf Score App - Seed Data
-- 초기 사용자 및 샘플 데이터

-- ============================================
-- 1. 초기 사용자 생성 (PIN: 0312)
-- bcrypt hash of "0312" with salt rounds 10
-- 실제 해시는 런타임에 생성해야 하므로 임시 값 사용
-- ============================================
INSERT INTO public.profiles (id, name, pin_hash)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '진대성',
  '$2a$10$placeholder_will_be_replaced'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. 샘플 코스 데이터
-- ============================================
INSERT INTO public.courses (user_id, name, holes, is_favorite)
VALUES
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '레이크힐스 CC',
  '[
    {"hole": 1, "par": 4},
    {"hole": 2, "par": 3},
    {"hole": 3, "par": 5},
    {"hole": 4, "par": 4},
    {"hole": 5, "par": 4},
    {"hole": 6, "par": 3},
    {"hole": 7, "par": 5},
    {"hole": 8, "par": 4},
    {"hole": 9, "par": 4},
    {"hole": 10, "par": 4},
    {"hole": 11, "par": 3},
    {"hole": 12, "par": 5},
    {"hole": 13, "par": 4},
    {"hole": 14, "par": 4},
    {"hole": 15, "par": 3},
    {"hole": 16, "par": 5},
    {"hole": 17, "par": 4},
    {"hole": 18, "par": 4}
  ]'::jsonb,
  true
),
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '파인밸리 GC',
  '[
    {"hole": 1, "par": 4},
    {"hole": 2, "par": 4},
    {"hole": 3, "par": 3},
    {"hole": 4, "par": 5},
    {"hole": 5, "par": 4},
    {"hole": 6, "par": 4},
    {"hole": 7, "par": 3},
    {"hole": 8, "par": 4},
    {"hole": 9, "par": 5},
    {"hole": 10, "par": 4},
    {"hole": 11, "par": 4},
    {"hole": 12, "par": 3},
    {"hole": 13, "par": 5},
    {"hole": 14, "par": 4},
    {"hole": 15, "par": 4},
    {"hole": 16, "par": 3},
    {"hole": 17, "par": 4},
    {"hole": 18, "par": 5}
  ]'::jsonb,
  false
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. 샘플 동반자 데이터
-- ============================================
INSERT INTO public.companions (user_id, name, nickname, is_favorite)
VALUES
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '김철수',
  '회사 동료',
  true
),
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '이영희',
  '동창',
  true
),
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '박민수',
  NULL,
  false
)
ON CONFLICT DO NOTHING;
