-- Add remaining_minutes to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS remaining_minutes numeric;
