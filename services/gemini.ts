import { Type } from "@google/genai";
import { supabase } from './supabase';
import { Category, Task, ThemeStyle, UserProfile, Theme } from '../types';

// Helper to call the Edge Function
const callGeminiProxy = async (params: any) => {
  // Force stable model
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
  `;

  try {
    const response = await callGeminiProxy({
      prompt: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Action-oriented task title" },
              description: { type: Type.STRING, description: "Short motivational detail" },
              category: { 
                type: Type.STRING, 
                enum: ["Career", "Health", "Finance", "Lifestyle", "Travel", "Personal"]
              },
              estimatedMinutes: { type: Type.INTEGER, description: "Estimated time to complete in minutes" }
            },
            required: ["title", "category", "estimatedMinutes"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Failed to generate tasks:", error);
    throw error;
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
    Based on this theme description: "${description}", suggest a Tailwind CSS color palette that matches the mood.
    Return JSON with fields:
    - gradientFrom: a tailwind color class (e.g., from-indigo-500)
    - gradientTo: a tailwind color class (e.g., to-purple-600)
    - accentColor: a text color class (e.g., text-indigo-600)
    - bgOverlay: a very light background color class (e.g., bg-indigo-50)
    - cardBorder: a border color class (e.g., border-indigo-200)
    
    Examples:
    "Energetic kickoff": from-rose-500, to-orange-500, text-rose-600, bg-rose-50, border-rose-200
    "Calm focus": from-emerald-400, to-cyan-500, text-emerald-700, bg-emerald-50, border-emerald-200
    "Dark feminine": from-slate-700, to-purple-900, text-purple-900, bg-slate-100, border-purple-200
  `;

  try {
    const response = await callGeminiProxy({
      prompt: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gradientFrom: { type: Type.STRING },
            gradientTo: { type: Type.STRING },
            accentColor: { type: Type.STRING },
            bgOverlay: { type: Type.STRING },
            cardBorder: { type: Type.STRING },
          },
          required: ["gradientFrom", "gradientTo", "accentColor", "bgOverlay", "cardBorder"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
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