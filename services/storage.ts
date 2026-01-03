import { Task, UserProfile, Theme, Story } from '../types';
import { supabase } from './supabase';

// Helper to get the current authenticated user's ID
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

export const saveUser = async (user: UserProfile): Promise<void> => {
  const userId = user.id || await getCurrentUserId();
  if (userId) {
     const { error } = await supabase.from('profiles').upsert({
         id: userId,
         email: user.email,
         name: user.name
     });
     if (error) console.error('Error saving user profile:', error);
  }
};

export const getUser = async (): Promise<UserProfile | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  
  return {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.user_metadata.name || 'Planner'
  };
};

export const logoutUser = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const getTasks = async (email?: string): Promise<Task[]> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn('getTasks: No authenticated user found');
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId); // Explicitly filter by user_id
    
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    themeId: t.theme_id,
    storyId: t.story_id,
    title: t.title,
    description: t.description,
    category: t.category,
    dueDate: t.due_date,
    estimatedMinutes: t.estimated_minutes,
    completed: t.completed,
    isAiGenerated: t.is_ai_generated
  }));
};

export const saveTasks = async (email: string, tasks: Task[]): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.error('saveTasks: No user ID found');
    return false;
  }

  if (tasks.length === 0) return true;

  const dbTasks = tasks.map(t => ({
    id: t.id,
    user_id: userId,
    theme_id: t.themeId,
    story_id: t.storyId || null,
    title: t.title,
    description: t.description,
    category: t.category,
    due_date: t.dueDate,
    estimated_minutes: t.estimatedMinutes,
    completed: t.completed,
    is_ai_generated: t.isAiGenerated
  }));

  const { error } = await supabase.from('tasks').upsert(dbTasks);
  
  if (error) {
    console.error('Error saving tasks:', error);
    return false;
  }
  return true;
};

export const getThemes = async (email?: string): Promise<Theme[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error fetching themes:', error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    startDate: t.start_date,
    endDate: t.end_date,
    style: t.style,
    completed: t.completed
  }));
};

export const saveThemes = async (email: string, themes: Theme[]): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  if (themes.length === 0) return true;

  const dbThemes = themes.map(t => ({
    id: t.id,
    user_id: userId,
    title: t.title,
    description: t.description,
    start_date: t.startDate,
    end_date: t.endDate,
    style: t.style,
    completed: t.completed
  }));

  const { error } = await supabase.from('themes').upsert(dbThemes);
  if (error) {
    console.error('Error saving themes:', error);
    return false;
  }
  return true;
};

export const getStories = async (email?: string): Promise<Story[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error fetching stories:', error);
    return [];
  }

  return data.map((s: any) => ({
    id: s.id,
    themeId: s.theme_id,
    title: s.title,
    description: s.description,
    createdAt: s.created_at
  }));
};

export const saveStories = async (email: string, stories: Story[]): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  if (stories.length === 0) return true;

  const dbStories = stories.map(s => ({
    id: s.id,
    user_id: userId,
    theme_id: s.themeId,
    title: s.title,
    description: s.description,
    created_at: s.createdAt
  }));

  const { error } = await supabase.from('stories').upsert(dbStories);
  if (error) {
    console.error('Error saving stories:', error);
    return false;
  }
  return true;
};

export const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) console.error('Error deleting task:', error);
}

export const deleteTheme = async (themeId: string) => {
    const { error } = await supabase.from('themes').delete().eq('id', themeId);
    if (error) console.error('Error deleting theme:', error);
}

export const deleteStory = async (storyId: string) => {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    if (error) console.error('Error deleting story:', error);
}
