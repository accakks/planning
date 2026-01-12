-- Make theme_id optional in stories table to allow global stories
ALTER TABLE public.stories ALTER COLUMN theme_id DROP NOT NULL;

-- Update foreign key to SET NULL on delete, ensuring stories persist if a theme is deleted
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_theme_id_fkey;
ALTER TABLE public.stories ADD CONSTRAINT stories_theme_id_fkey 
  FOREIGN KEY (theme_id) REFERENCES public.themes(id) ON DELETE SET NULL;
