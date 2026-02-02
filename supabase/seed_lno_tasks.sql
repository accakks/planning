-- SQL Script to restore the default LNO tasks to your user account.
-- Run this in the Supabase SQL Editor.

DO $$
DECLARE
    target_user_id uuid;
    target_theme_id uuid;
    today_date date := current_date;
BEGIN
    -- 1. Find the User
    -- REPLACE 'your_email@example.com' WITH YOUR ACTUAL EMAIL
    -- This ensures we add tasks to the correct account.
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'ajka@planning.app';

    IF target_user_id IS NULL THEN
        -- Fallback: verify if any user exists at all, or show error
        RAISE NOTICE 'User with specified email not found. Checking for ANY user...';
        SELECT id INTO target_user_id FROM auth.users LIMIT 1;
    END IF;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'No user found in auth.users. Please sign up first.';
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding tasks for User ID: %', target_user_id;

    -- 2. Find Active Theme (or create one)
    SELECT id INTO target_theme_id 
    FROM public.themes 
    WHERE user_id = target_user_id 
    ORDER BY created_at DESC 
    LIMIT 1;

    -- If no theme exists, create a default "2026 Kickoff" theme
    IF target_theme_id IS NULL THEN
        INSERT INTO public.themes (user_id, title, description, start_date, end_date, style)
        VALUES (
            target_user_id, 
            '2026 Kickoff', 
            'Starting the year with high energy and focus.', 
            today_date, 
            today_date + 45,
            '{"gradientFrom": "from-rose-500", "gradientTo": "to-orange-500", "accentColor": "text-rose-600", "bgOverlay": "bg-rose-50", "cardBorder": "border-rose-200"}'::jsonb
        )
        RETURNING id INTO target_theme_id;
        RAISE NOTICE 'Created new theme: 2026 Kickoff';
    ELSE
        RAISE NOTICE 'Using existing theme ID: %', target_theme_id;
    END IF;

    -- 3. Insert Tasks
    -- We delete existing tasks with these exact titles to avoid duplicates if run multiple times
    DELETE FROM public.tasks WHERE user_id = target_user_id AND lno_type IS NOT NULL AND title IN (
        'Make solid plan for Copilot product (3 months)',
        'Elaborate on actions plan (part of the 3-month plan)', 
        'Review major roadmap items for tomorrow''s call',
        'Review architecture plan by Harish',
        'Update Copilot prompt for tools & guardrails',
        'Review PMM material for Copilot',
        'Setup and review analytics for Copilot',
        'Visualise resolution rate',
        'Close feature requests by EoD',
        'Review requests by Nitish',
        'Reply to everyone who pinged',
        'Setup call with Dinesh',
        'Prep for call with Vinayak'
    );

    INSERT INTO public.tasks (user_id, theme_id, title, description, category, estimated_minutes, lno_type, is_important, due_date)
    VALUES 
    -- Phase 1: Leverage
    (target_user_id, target_theme_id, 'Make solid plan for Copilot product (3 months)', 'Strategic planning. Requires deep focus. Don''t aim for final polish, aim for solid logic.', 'Career', 60, 'L', true, now() + interval '1 day'),
    (target_user_id, target_theme_id, 'Elaborate on actions plan (part of the 3-month plan)', 'Define the ''How'' for the strategic goals.', 'Career', 45, 'L', false, now() + interval '1 day'),
    (target_user_id, target_theme_id, 'Review major roadmap items for tomorrow''s call', 'Critical prep. Scan for blockers and risks.', 'Career', 30, 'L', true, now() + interval '4 hours'),
    
    -- Phase 2: Neutral
    (target_user_id, target_theme_id, 'Review architecture plan by Harish', 'Focus on ''Good Enough'' & functionality. Check for feasibility.', 'Career', 45, 'N', false, now() + interval '2 days'),
    (target_user_id, target_theme_id, 'Update Copilot prompt for tools & guardrails', 'Technical execution. Ensure safety and accuracy.', 'Career', 60, 'N', false, now() + interval '2 days'),
    (target_user_id, target_theme_id, 'Review PMM material for Copilot', 'Alignment check. Don''t get stuck on grammar.', 'Career', 30, 'N', false, now() + interval '3 days'),

    -- Phase 3: Overhead
    (target_user_id, target_theme_id, 'Setup and review analytics for Copilot', 'Quick check. Don''t build a new dashboard.', 'Career', 15, 'O', false, now() + interval '5 hours'),
    (target_user_id, target_theme_id, 'Visualise resolution rate', 'Get the number, visualize simple chart if needed, move on.', 'Career', 15, 'O', false, now() + interval '5 hours'),
    (target_user_id, target_theme_id, 'Close feature requests by EoD', 'Admin task. Rapid fire.', 'Career', 30, 'O', false, now() + interval '8 hours'),
    (target_user_id, target_theme_id, 'Review requests by Nitish', 'Unblocking team members.', 'Career', 20, 'O', false, now() + interval '1 day'),
    (target_user_id, target_theme_id, 'Reply to everyone who pinged', 'Clear the inbox. Batch this communication.', 'Career', 45, 'O', false, now() + interval '1 hour'),
    (target_user_id, target_theme_id, 'Setup call with Dinesh', 'Scheduling.', 'Career', 5, 'O', false, now() + interval '1 hour'),
    (target_user_id, target_theme_id, 'Prep for call with Vinayak', 'Quick agenda setting.', 'Career', 10, 'O', false, now() + interval '2 hours');

    RAISE NOTICE 'Successfully seeded LNO tasks.';
END $$;
