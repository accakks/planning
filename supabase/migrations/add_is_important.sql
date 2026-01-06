-- Migration: Add is_important column to tasks and stories tables
-- This fixes the PGRST204 error where PostgREST couldn't find the 'is_important' column.

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;
