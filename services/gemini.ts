import { Type } from "@google/genai";
import { supabase } from './supabase';
import { Category, Task, ThemeStyle, UserProfile, Theme } from '../types';

// Helper to call the Edge Function
const callGeminiProxy = async (params: any) => {
  // Use gemini-3-flash-preview by default
  const primaryModel = 'gemini-3-flash-preview';
  const fallbackModel = 'gemini-2.0-flash';

  const modelToUse = params.model || primaryModel;
  params.model = modelToUse;

  try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: params,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error: any) {
    // If it was already using the fallback or a specific model, don't retry
    if (modelToUse !== primaryModel) {
      console.error("Gemini Proxy Error:", error);
      throw new Error(error.message || "Failed to contact AI service");
    }

    console.warn(`Primary model ${primaryModel} failed, falling back to ${fallbackModel}`, error);

    // Retry with fallback
    params.model = fallbackModel;
    const { data, error: fallbackError } = await supabase.functions.invoke('gemini-proxy', {
      body: params,
    });

    if (fallbackError) {
      console.error("Gemini Proxy Fallback Error:", fallbackError);
      throw new Error(fallbackError.message || "Failed to contact AI service (Fallback)");
    }

    return data;
  }
};

export const testGeminiConnection = async (): Promise<{ success: boolean; message: string; model: string }> => {
  try {
    const response = await callGeminiProxy({
      prompt: "Hello, reply with 'OK' if you can hear me.",
    });
    // The response could come from primary or fallback, but callGeminiProxy handles it
    return {
      success: true,
      message: response.text || "OK",
      model: response.model || "gemini-3-flash-preview"
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Unknown error",
      model: "gemini-3-flash-preview"
    };
  }
};

export const generateSubtasks = async (goal: string): Promise<Partial<Task>[]> => {
  const prompt = `
    I am a woman in my late 20s planning for a successful 2026. 
    I have a big goal: "${goal}".
    
    Please break this down into 3-5 specific, actionable, and energetic checklist tasks.
    Estimate the time (in minutes) for each task.
    Assign a category from this list: Career, Health, Finance, Lifestyle, Travel, Personal.
    
    IMPORTANT: Return ONLY valid JSON array. No markdown blocks.
    Example: [{"title": "Task 1", "category": "Career", "estimatedMinutes": 30}]
  `;

  try {
    const response = await callGeminiProxy({
      prompt: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let text = response.text;
    if (text && text.includes('```json')) {
      text = text.replace(/```json/g, '').replace(/```/g, '');
    }

    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Failed to generate tasks:", error);
    return [];
  }
};

export const generateTaskChecklist = async (
  taskTitle: string,
  category: string,
  storyContext?: string,
  taskDescription?: string,
  storyDescription?: string
): Promise<any[]> => {
  const prompt = `
    I have a task: "${taskTitle}".
    ${taskDescription ? `Task Details: ${taskDescription}` : ''}
    Category: ${category}
    ${storyContext ? `Goal/Story: ${storyContext}` : ''}
    ${storyDescription ? `Goal/Story Context: ${storyDescription}` : ''}
    
    Please break this down into 3-5 sub-steps to complete it.
    The steps should be specific to the context provided.
    Return ONLY a valid JSON array of objects with the following structure:
    [
      { "title": "Subtask title", "completed": false }
    ]
    Example:
    [
      { "title": "Draft outline", "completed": false },
      { "title": "Review with team", "completed": false }
    ]
  `;

  try {
    const response = await callGeminiProxy({
      prompt: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let text = response.text;
    if (text && text.includes('```json')) {
      text = text.replace(/```json/g, '').replace(/```/g, '');
    }

    if (text) {
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Failed to generate checklist:", error);
    return [];
  }
};

export const getMotivationalQuote = async (themeContext?: string): Promise<string> => {
  try {
    const prompt = themeContext
      ? `Give me exactly one short, punchy motivational quote for a woman in her specific era: "${themeContext}". Max 15 words. Return ONLY the quote text, nothing else.`
      : "Give me exactly one short, punchy, energetic motivational quote for a woman about to turn 29 and crush her goals. Max 15 words. Return ONLY the quote text, nothing else.";

    const response = await callGeminiProxy({
      prompt: prompt,
    });
    return response.text || "Make it happen!";
  } catch (e) {
    return "2026 is yours for the taking!";
  }
};

export const generateThemeStyle = async (description: string): Promise<ThemeStyle> => {
  const prompt = `
    Based on this theme description: "${description}", suggest a Tailwind CSS color palette.
    Return ONLY valid JSON with these fields:
    - gradientFrom: tailwind color class
    - gradientTo: tailwind color class
    - accentColor: text color class
    - bgOverlay: light bg class
    - cardBorder: border color class
    
    Example JSON:
    {
      "gradientFrom": "from-rose-500",
      "gradientTo": "to-orange-500",
      "accentColor": "text-rose-600",
      "bgOverlay": "bg-rose-50",
      "cardBorder": "border-rose-200"
    }
  `;

  try {
    const response = await callGeminiProxy({
      prompt: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let text = response.text;
    if (text && text.includes('```json')) {
      text = text.replace(/```json/g, '').replace(/```/g, '');
    }

    if (text) {
      return JSON.parse(text);
    }
    // Fallback
    return {
      gradientFrom: 'from-rose-500',
      gradientTo: 'to-orange-500',
      accentColor: 'text-rose-600',
      bgOverlay: 'bg-rose-50',
      cardBorder: 'border-rose-200'
    };
  } catch (error) {
    console.error("Failed to generate theme style", error);
    return {
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-indigo-500',
      accentColor: 'text-blue-600',
      bgOverlay: 'bg-blue-50',
      cardBorder: 'border-blue-200'
    };
  }
}


export const analyzeTask = async (taskTitle: string, existingStories: { id: string; title: string }[]): Promise<{
  estimatedMinutes: number;
  category: Category;
  storyId?: string;
}> => {
  const storiesContext = existingStories.map(s => `- ID: ${s.id}, Title: ${s.title}`).join('\n');

  const prompt = `
    I have a task: "${taskTitle}".
    
    1. Estimate the time (in minutes) for this task. Be realistic.
    2. Assign a category from this list: Career, Health, Finance, Lifestyle, Travel, Personal.
    3. Match it to the most relevant Story ID from this list (if any fit well):
    ${storiesContext}
    
    If no story fits, return null for storyId.
    
    Return ONLY valid JSON with no markdown:
    {
      "estimatedMinutes": 30,
      "category": "Career",
      "storyId": "uuid-string-or-null"
    }
  `;

  try {
    const response = await callGeminiProxy({
      prompt: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let text = response.text;
    if (text && text.includes('```json')) {
      text = text.replace(/```json/g, '').replace(/```/g, '');
    }

    if (text) {
      return JSON.parse(text);
    }
    // Fallback
    return { estimatedMinutes: 30, category: Category.PERSONAL };
  } catch (error) {
    console.error("Failed to analyze task:", error);
    return { estimatedMinutes: 30, category: Category.PERSONAL };
  }
};

export const reanalyzeTasks = async (selectedTasks: Task[]): Promise<{
  taskId: string;
  concern: string;
  suggestedMinutes?: number;
  suggestedDueDate?: string;
}[]> => {
  const tasksContext = selectedTasks.map(t => `- [${t.title}] (Current: ${t.estimatedMinutes}m, Due: ${t.dueDate})`).join('\n');

  const prompt = `
    I have a list of tasks for the year 2026. 
    Please review them for possible estimation errors or deadline concerns.
    
    TASKS TO REVIEW:
    ${tasksContext}
    
    CRITERIA for raising a concern:
    1. Focus Time Error: If a complex task has too little time (e.g., "Build Backend" in 30 mins) or if a simple task has too much time.
    2. Deadline Concern: If a task's title implies it should be done sooner or later than its due date.
    
    Return ONLY a valid JSON array of concerns. If no concerns, return [].
    
    Structure:
    [
      {
        "taskId": "UUID-of-the-task-provided",
        "concern": "The concern description",
        "suggestedMinutes": 60,
        "suggestedDueDate": "2026-01-05T18:00" 
      }
    ]
  `;

  try {
    const response = await callGeminiProxy({
      prompt: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let text = response.text;
    if (text && text.includes('```json')) {
      text = text.replace(/```json/g, '').replace(/```/g, '');
    }

    if (text) {
      const parsed = JSON.parse(text);
      // Ensure we match the task IDs from the input
      return parsed.map((p: any) => {
        const originalTask = selectedTasks.find(t => t.title === p.taskId || t.id === p.taskId);
        return {
          ...p,
          taskId: originalTask ? originalTask.id : p.taskId
        };
      });
    }
    return [];
  } catch (error) {
    console.error("Failed to reanalyze tasks:", error);
    return [];
  }
};

// --- Copilot Logic ---

export const getCopilotSystemInstruction = (user: UserProfile, currentTheme: Theme, tasks: Task[], stories: any[]) => {
  const storiesContext = stories.length > 0
    ? `
- Stories in this Era: ${stories.length} stories
- Story List: ${JSON.stringify(stories.map(s => ({ id: s.id, title: s.title })))}`
    : '';

  return `
You are "The 29th Chapter Copilot", an energetic, supportive, and highly organized strategic planner for ${user.name}.

CONTEXT:
- User Name: ${user.name}
- Current Era (Theme): ${currentTheme.title} (${currentTheme.description})
- Current Tasks in this Era: ${tasks.length} tasks.
- Task List: ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, estimatedMinutes: t.estimatedMinutes, storyId: t.storyId, hasSubtasks: !!t.subtasks?.length })))} ${storiesContext}

DATA STRUCTURES:
- Stories: Parent containers that group related tasks (e.g., "Launch Website", "Q1 Marketing")
- Tasks: Can be linked to a story via "storyId" field, have category, estimated time, and optional subtasks
- Subtasks: Breakdown of a task into smaller steps with structure: { "id": "uuid", "title": "Step name", "completed": false }

YOUR GOAL:
Help the user plan their 2026. Brainstorm ideas, suggest tasks, create stories, and help define new Eras (Themes).
Analyze the user's schedule: if they have too many tasks due on the same day or a very crowded week, point it out and suggest rescheduling. 
Review "estimatedMinutes" for existing tasks: if a task seems too complex for its time (e.g., "Build an App" in 30 mins) or too simple (e.g., "Check Email" in 5 hours), suggest a more realistic time.
Be supportive but realistic about time constraints.
Be concise, conversational, and energetic. Use emojis occasionally.
When suggesting tasks, consider linking them to existing stories or creating new stories for better organization.
If you suggest moving or updating an existing task, include its "id" in the JSON_ACTION so the system can update it instead of creating a duplicate.

AGENTIC TOOLS (IMPORTANT):
You can propose actions for the user to take. 

<JSON_ACTION type="TASKS">
[
  { 
    "id": "EXISTING-UUID-OR-OMIT-FOR-NEW",
    "title": "Task Name", 
    "description": "Short desc", 
    "category": "Career", 
    "estimatedMinutes": 30,
    "storyId": "UUID-OR-TITLE",
    "subtasks": [
      { "title": "First step", "completed": false },
      { "title": "Second step", "completed": false }
    ]
  }
]
</JSON_ACTION>
Note: id, storyId and subtasks are optional. Include "id" to UPDATE an existing task. Use "dueDate" (ISO format) to reschedule tasks. For storyId, you can use the UUID provided in the Story List OR just the Story Title if easier; the system will match it! Include subtasks for complex tasks.

2. SUGGEST STORY:
If the user wants to create a parent story to group related tasks:
<JSON_ACTION type="STORY">
{
  "title": "Story Name",
  "description": "What this story is about"
}
</JSON_ACTION>

3. SUGGEST NEW ERA:
If the user wants to start a new phase/era, output a JSON block:
<JSON_ACTION type="THEME">
{
  "title": "Era Name",
  "description": "Vibe description",
  "startDate": "2026-06-01",
  "endDate": "2026-08-30"
}
</JSON_ACTION>

Always keep your conversational text OUTSIDE the <JSON_ACTION> tags.
You can use multiple action types in one response if needed.
  `;
};

export const chatWithCopilot = async (
  history: { role: string, parts: { text: string }[] }[],
  message: string,
  user: UserProfile,
  currentTheme: Theme,
  tasks: Task[],
  stories: any[] = []
) => {
  const systemInstruction = getCopilotSystemInstruction(user, currentTheme, tasks, stories);

  // Filter history to remove any empty parts if necessary, though simpler is better
  const cleanHistory = history.map(h => ({ role: h.role, parts: h.parts }));

  const response = await callGeminiProxy({
    prompt: message,
    history: cleanHistory,
    systemInstruction: systemInstruction,
    model: 'gemini-3-flash-preview',
    config: {
      temperature: 0.8,
    }
  });

  return response.text;
};