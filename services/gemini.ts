import { Type } from "@google/genai";
import { supabase } from './supabase';
import { Category, Task, ThemeStyle, UserProfile, Theme } from '../types';

// Helper to call the Edge Function
const callGeminiProxy = async (params: any) => {
  params.model = 'gemini-1.5-flash';

  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: params,
  });

  if (error) {
    console.error("Gemini Proxy Error:", error);
    throw new Error(error.message || "Failed to contact AI service");
  }

  return data;
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
    if (text.includes('```json')) {
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

export const getMotivationalQuote = async (themeContext?: string): Promise<string> => {
  try {
    const prompt = themeContext 
      ? `Give me a short, punchy motivational quote for a woman in her specific era: "${themeContext}". Max 15 words.`
      : "Give me one short, punchy, energetic motivational quote for a woman about to turn 29 and crush her goals. Max 15 words.";
      
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
    if (text.includes('```json')) {
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

// --- Copilot Logic ---

export const getCopilotSystemInstruction = (user: UserProfile, currentTheme: Theme, tasks: Task[]) => {
  return `
    You are "The 29th Chapter Copilot", an energetic, supportive, and highly organized strategic planner for ${user.name}.
    
    CONTEXT:
    - User Name: ${user.name}
    - Current Era (Theme): ${currentTheme.title} (${currentTheme.description})
    - Current Tasks in this Era: ${tasks.length} tasks.
    - Task List: ${JSON.stringify(tasks.map(t => t.title))}

    YOUR GOAL:
    Help the user plan their 2026. Brainstorm ideas, suggest tasks, and help define new Eras (Themes).
    Be concise, conversational, and energetic. Use emojis occasionally.

    AGENTIC TOOLS (IMPORTANT):
    You can propose actions for the user to take. 
    
    1. SUGGEST TASKS:
    If the user agrees to a plan or asks for tasks, output a JSON block inside specific tags:
    <JSON_ACTION type="TASKS">
    [
      { "title": "Task Name", "description": "Short desc", "category": "Career", "estimatedMinutes": 30 }
    ]
    </JSON_ACTION>

    2. SUGGEST NEW ERA:
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
  `;
};

export const chatWithCopilot = async (
  history: { role: string, parts: { text: string }[] }[], 
  message: string,
  user: UserProfile,
  currentTheme: Theme,
  tasks: Task[]
) => {
  const systemInstruction = getCopilotSystemInstruction(user, currentTheme, tasks);

  // Filter history to remove any empty parts if necessary, though simpler is better
  const cleanHistory = history.map(h => ({ role: h.role, parts: h.parts }));

  const response = await callGeminiProxy({
    prompt: message,
    history: cleanHistory,
    systemInstruction: systemInstruction,
    config: {
        temperature: 0.8,
    }
  });

  return response.text;
};