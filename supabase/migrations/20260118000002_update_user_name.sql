-- My Golf Score App - Update User Name
-- Migration: 20260118000002_update_user_name
-- Purpose: Update default name from '사용자' to '진대성' and update existing records

-- ============================================
-- 1. Update default value for name column
-- ============================================
ALTER TABLE public.profiles
ALTER COLUMN name SET DEFAULT '진대성';

-- ============================================
-- 2. Update existing records with '사용자' to '진대성'
-- ============================================
UPDATE public.profiles
SET name = '진대성'
WHERE name = '사용자';
