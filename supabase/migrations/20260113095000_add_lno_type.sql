-- Add lno_type column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS lno_type text;

-- Add comment to explain values
COMMENT ON COLUMN public.tasks.lno_type IS 'L = Leverage, N = Neutral, O = Overhead';
