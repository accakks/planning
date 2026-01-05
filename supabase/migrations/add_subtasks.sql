-- Migration: Add subtasks column to tasks table
ALTER TABLE public.tasks ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;
