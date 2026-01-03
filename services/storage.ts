import { Task, UserProfile, Theme, Story } from '../types';

const USER_KEY = 'kickoff_user';
const TASKS_PREFIX = 'kickoff_tasks_';
const THEMES_PREFIX = 'kickoff_themes_';
const STORIES_PREFIX = 'kickoff_stories_';

export const saveUser = (user: UserProfile): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = (): UserProfile | null => {
  const data = localStorage.getItem(USER_KEY);
  try {
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error parsing user data from storage", error);
    // If data is corrupted, clear it so the user can log in fresh
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const logoutUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

export const getTasks = (email: string): Task[] => {
  const data = localStorage.getItem(`${TASKS_PREFIX}${email}`);
  try {
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing tasks", error);
    return [];
  }
};

export const saveTasks = (email: string, tasks: Task[]): void => {
  localStorage.setItem(`${TASKS_PREFIX}${email}`, JSON.stringify(tasks));
};

export const getThemes = (email: string): Theme[] => {
  const data = localStorage.getItem(`${THEMES_PREFIX}${email}`);
  try {
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing themes", error);
    return [];
  }
};

export const saveThemes = (email: string, themes: Theme[]): void => {
  localStorage.setItem(`${THEMES_PREFIX}${email}`, JSON.stringify(themes));
};

export const getStories = (email: string): Story[] => {
  const data = localStorage.getItem(`${STORIES_PREFIX}${email}`);
  try {
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing stories", error);
    return [];
  }
};

export const saveStories = (email: string, stories: Story[]): void => {
  localStorage.setItem(`${STORIES_PREFIX}${email}`, JSON.stringify(stories));
};