export enum Category {
  CAREER = 'Career',
  HEALTH = 'Health',
  FINANCE = 'Finance',
  LIFESTYLE = 'Lifestyle',
  TRAVEL = 'Travel',
  PERSONAL = 'Personal'
}

export interface ThemeStyle {
  gradientFrom: string; // Tailwind class e.g. 'from-rose-400'
  gradientTo: string;   // Tailwind class e.g. 'to-orange-400'
  accentColor: string;  // Tailwind class e.g. 'text-rose-600'
  bgOverlay: string;    // Tailwind class e.g. 'bg-rose-50'
  cardBorder: string;   // Tailwind class for card borders
}

export interface Theme {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  style: ThemeStyle;
  completed?: boolean;
}

export interface Story {
  id: string;
  themeId: string;
  title: string;
  description?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  themeId: string; // Link task to a specific theme
  storyId?: string; // Link task to a specific story (optional for backward compatibility)
  title: string;
  description?: string;
  category: Category;
  dueDate: string; // ISO Date string
  estimatedMinutes: number;
  completed: boolean;
  isAiGenerated?: boolean;
}

export interface UserProfile {
  email: string;
  name: string;
}

export interface ChartData {
  name: string;
  value: number;
  fill: string;
  [key: string]: any;
}

// --- Copilot Types ---

export type Sender = 'user' | 'ai';

export interface ChatMessage {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  // If the AI suggests actions, they are parsed and stored here
  suggestedTasks?: Partial<Task>[];
  suggestedTheme?: Partial<Theme>;
}