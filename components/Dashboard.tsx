import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Task, Category, ChartData, Theme, ThemeStyle, Story } from '../types';
import { getTasks, saveTasks, getThemes, saveThemes, getStories, saveStories, deleteTask as apiDeleteTask, deleteTheme as apiDeleteTheme, deleteStory as apiDeleteStory } from '../services/storage';
import { generateSubtasks, getMotivationalQuote, generateThemeStyle } from '../services/gemini';
import { Plus, Trash2, CheckCircle2, Circle, Loader2, LogOut, Sparkles, TrendingUp, Target, Clock, AlertCircle, Calendar, Map, LayoutList, FolderKanban, BookOpen, X, Pencil } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import CalendarButton from './CalendarButton';
import FocusMode from './FocusMode';
import YearRoadmap from './YearRoadmap';
import Copilot from './Copilot';

import DebugOverlay from './DebugOverlay';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

const CATEGORY_COLORS: Record<Category, string> = {
  [Category.CAREER]: '#6366f1', // Indigo
  [Category.FINANCE]: '#10b981', // Emerald
  [Category.HEALTH]: '#f43f5e', // Rose
  [Category.LIFESTYLE]: '#f59e0b', // Amber
  [Category.TRAVEL]: '#0ea5e9', // Sky
  [Category.PERSONAL]: '#8b5cf6', // Violet
};

// Default style fallback
const DEFAULT_STYLE: ThemeStyle = {
  gradientFrom: 'from-rose-500',
  gradientTo: 'to-orange-500',
  accentColor: 'text-rose-600',
  bgOverlay: 'bg-rose-50',
  cardBorder: 'border-rose-200'
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentThemeId, setCurrentThemeId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState('');
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  // View Mode: 'list' or 'story'
  const [viewMode, setViewMode] = useState<'list' | 'story'>('list');

  // Modals & Views
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  // Theme State
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [newThemeTitle, setNewThemeTitle] = useState('');
  const [newThemeDesc, setNewThemeDesc] = useState('');
  const [newThemeStart, setNewThemeStart] = useState('');
  const [newThemeEnd, setNewThemeEnd] = useState('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);

  // New Task State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<Category>(Category.CAREER);
  const [newTaskMinutes, setNewTaskMinutes] = useState(30);
  const [newTaskDate, setNewTaskDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // Story selection in Task Modal
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [isCreatingNewStory, setIsCreatingNewStory] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Load Data
  const loadData = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setLastError(null);
    try {
      const [loadedTasks, loadedThemes, loadedStories] = await Promise.all([
        getTasks(user.email),
        getThemes(user.email),
        getStories(user.email)
      ]);

      // Migration or Initialization: Ensure at least one theme exists
      if (loadedThemes.length === 0) {
        const defaultTheme: Theme = {
          id: crypto.randomUUID(),
          title: "2026 Kickoff",
          description: "Starting the year with high energy and focus.",
          startDate: "2026-01-01",
          endDate: "2026-02-15",
          style: DEFAULT_STYLE
        };
        loadedThemes.push(defaultTheme);
        await saveThemes(user.email, loadedThemes);

        const updatedTasks = loadedTasks.map(t => t.themeId ? t : { ...t, themeId: defaultTheme.id });
        setTasks(updatedTasks);
        await saveTasks(user.email, updatedTasks);
      } else {
        setTasks(loadedTasks);
      }

      setThemes(loadedThemes);
      setStories(loadedStories);

      // Select the theme that contains today's date, or the latest one if not found
      if (!currentThemeId) {
        const today = new Date().toISOString().split('T')[0];
        const activeTheme = loadedThemes.find(t => today >= t.startDate && today <= t.endDate) || loadedThemes[loadedThemes.length - 1];
        if (activeTheme) {
          setCurrentThemeId(activeTheme.id);
        }
      }
    } catch (e: any) {
      console.error("Failed to load data", e);
      setLastError(e.message || "Unknown error loading data");
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();

    // Refetch when window regains focus to ensure multi-device sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData(true);
      }
    };

    // Also refetch on focus
    const handleFocus = () => {
      loadData(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user.email]);


  const currentTheme = useMemo(() =>
    themes.find(t => t.id === currentThemeId) || themes[0]
    , [themes, currentThemeId]);

  useEffect(() => {
    if (currentTheme) {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `daily_quote_${currentTheme.id}_${today}`;
      const cachedQuote = localStorage.getItem(cacheKey);

      if (cachedQuote) {
        setQuote(cachedQuote);
      } else {
        getMotivationalQuote(currentTheme.description).then(newQuote => {
          setQuote(newQuote);
          localStorage.setItem(cacheKey, newQuote);
        });
      }
    }
  }, [currentTheme]);

  const currentThemeTasks = useMemo(() =>
    tasks.filter(t => t.themeId === currentThemeId)
    , [tasks, currentThemeId]);

  const currentThemeStories = useMemo(() =>
    stories.filter(s => s.themeId === currentThemeId)
    , [stories, currentThemeId]);

  const stats = useMemo(() => {
    const total = currentThemeTasks.length;
    const completed = currentThemeTasks.filter(t => t.completed).length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    const data: ChartData[] = Object.values(Category).map(cat => ({
      name: cat,
      value: currentThemeTasks.filter(t => t.category === cat).length,
      fill: CATEGORY_COLORS[cat]
    })).filter(d => d.value > 0);

    return { total, completed, progress, data };
  }, [currentThemeTasks]);

  // --- Theme Logic ---

  const openNewThemeModal = () => {
    setEditingTheme(null);
    setNewThemeTitle('');
    setNewThemeDesc('');
    setNewThemeStart('');
    setNewThemeEnd('');
    setIsThemeModalOpen(true);
  };

  const handleEditTheme = (theme: Theme) => {
    setEditingTheme(theme);
    setNewThemeTitle(theme.title);
    setNewThemeDesc(theme.description);
    setNewThemeStart(theme.startDate);
    setNewThemeEnd(theme.endDate);
    setIsThemeModalOpen(true);
  };

  const handleThemeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeTitle || !newThemeStart || !newThemeEnd) return;

    setIsGeneratingTheme(true);
    try {
      let style = editingTheme?.style || DEFAULT_STYLE;
      if (!editingTheme || editingTheme.description !== newThemeDesc) {
        style = await generateThemeStyle(newThemeDesc || newThemeTitle);
      }

      if (editingTheme) {
        const updatedTheme = {
          ...editingTheme,
          title: newThemeTitle,
          description: newThemeDesc,
          startDate: newThemeStart,
          endDate: newThemeEnd,
          style: style
        };
        setThemes(prev => prev.map(t => t.id === editingTheme.id ? updatedTheme : t));
        await saveThemes(user.email, [updatedTheme]);
      } else {
        const newTheme: Theme = {
          id: crypto.randomUUID(),
          title: newThemeTitle,
          description: newThemeDesc,
          startDate: newThemeStart,
          endDate: newThemeEnd,
          style: style,
          completed: false
        };
        setThemes(prev => [...prev, newTheme]);
        setCurrentThemeId(newTheme.id);
        await saveThemes(user.email, [newTheme]);
      }

      setIsThemeModalOpen(false);
      setEditingTheme(null);
      setNewThemeTitle('');
      setNewThemeDesc('');
      setNewThemeStart('');
      setNewThemeEnd('');
    } catch (e) {
      alert("Could not process theme, try again.");
    } finally {
      setIsGeneratingTheme(false);
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (themes.length <= 1) {
      alert("You need at least one era defined.");
      return;
    }

    await apiDeleteTheme(themeId);

    setThemes(prev => prev.filter(t => t.id !== themeId));
    setTasks(prev => prev.filter(t => t.themeId !== themeId));
    setStories(prev => prev.filter(s => s.themeId !== themeId));

    if (currentThemeId === themeId) {
      const remaining = themes.filter(t => t.id !== themeId);
      if (remaining.length > 0) setCurrentThemeId(remaining[0].id);
    }
  };

  const handleToggleThemeComplete = async (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      const updatedTheme = { ...theme, completed: !theme.completed };
      setThemes(prev => prev.map(t =>
        t.id === themeId ? updatedTheme : t
      ));
      await saveThemes(user.email, [updatedTheme]);
    }
  };

  // --- Task & Story Logic ---

  const addTask = async (title: string, category: Category, minutes: number, dateStr: string, storyId?: string, isAi = false) => {
    const task: Task = {
      id: crypto.randomUUID(),
      themeId: currentThemeId,
      storyId: storyId,
      title,
      category,
      estimatedMinutes: minutes,
      dueDate: dateStr,
      completed: false,
      isAiGenerated: isAi
    };
    setTasks(prev => [task, ...prev]);
    await saveTasks(user.email, [task]);
    // Optionally reload to confirm sync
    // loadData();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskCategory(task.category);
    setNewTaskMinutes(task.estimatedMinutes);
    setNewTaskDate(task.dueDate);
    setSelectedStoryId(task.storyId || '');
    setIsCreatingNewStory(false);
    setNewStoryTitle('');
    setIsTaskModalOpen(true);
  };

  const handleManualTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    let finalStoryId = selectedStoryId;

    // Handle "Create New Story" on the fly
    if (isCreatingNewStory && newStoryTitle) {
      const newStory: Story = {
        id: crypto.randomUUID(),
        themeId: currentThemeId,
        title: newStoryTitle,
        createdAt: new Date().toISOString()
      };
      setStories(prev => [...prev, newStory]);
      await saveStories(user.email, [newStory]);
      finalStoryId = newStory.id;
    }

    if (editingTask) {
      const updatedTask: Task = {
        ...editingTask,
        title: newTaskTitle,
        category: newTaskCategory,
        estimatedMinutes: newTaskMinutes,
        dueDate: newTaskDate,
        storyId: finalStoryId || undefined,
      };
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
      await saveTasks(user.email, [updatedTask]);
    } else {
      addTask(newTaskTitle, newTaskCategory, newTaskMinutes, newTaskDate, finalStoryId || undefined);
    }

    // Reset
    setEditingTask(null);
    setNewTaskTitle('');
    setSelectedStoryId('');
    setIsCreatingNewStory(false);
    setNewStoryTitle('');
    setIsTaskModalOpen(false);
  };

  const handleAiTaskGenerate = async () => {
    if (!aiPrompt) return;
    setIsGeneratingTasks(true);
    try {
      const generatedTasks = await generateSubtasks(aiPrompt);

      // If the prompt implies a story, maybe create one? 
      // For now, let's put them in "Uncategorized" or the currently selected story if any.

      let finalStoryId = selectedStoryId;
      if (isCreatingNewStory && newStoryTitle) {
        const newStory: Story = {
          id: crypto.randomUUID(),
          themeId: currentThemeId,
          title: newStoryTitle,
          createdAt: new Date().toISOString()
        };
        setStories(prev => [...prev, newStory]);
        await saveStories(user.email, [newStory]);
        finalStoryId = newStory.id;
      }

      const newTasks = generatedTasks.map(t => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return {
          id: crypto.randomUUID(),
          themeId: currentThemeId,
          storyId: finalStoryId || undefined,
          title: t.title || "New Task",
          description: t.description || "",
          category: (t.category as Category) || Category.PERSONAL,
          estimatedMinutes: t.estimatedMinutes || 30,
          dueDate: now.toISOString().slice(0, 10) + 'T23:59',
          completed: false,
          isAiGenerated: true
        };
      }) as Task[];

      setTasks(prev => [...newTasks, ...prev]);
      await saveTasks(user.email, newTasks);
      setAiPrompt('');
      setIsTaskModalOpen(false);

      // Cleanup Story states
      setSelectedStoryId('');
      setIsCreatingNewStory(false);
      setNewStoryTitle('');

    } catch (error) {
      alert("Oops! Couldn't generate tasks right now. Try again.");
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  // --- Copilot Handlers ---
  const handleCopilotAddTasks = async (suggestedTasks: Partial<Task>[]) => {
    const now = new Date();
    const newTasks = suggestedTasks.map(t => ({
      id: crypto.randomUUID(),
      themeId: currentThemeId,
      title: t.title || "New Idea",
      description: t.description || "",
      category: t.category || Category.PERSONAL,
      estimatedMinutes: t.estimatedMinutes || 30,
      dueDate: now.toISOString().slice(0, 10) + 'T23:59',
      completed: false,
      isAiGenerated: true
    })) as Task[];
    setTasks(prev => [...newTasks, ...prev]);
    await saveTasks(user.email, newTasks);
  };

  const handleCopilotAddTheme = async (theme: Partial<Theme>) => {
    if (!theme.title) return;

    const style = await generateThemeStyle(theme.description || theme.title);

    const newTheme: Theme = {
      id: crypto.randomUUID(),
      title: theme.title,
      description: theme.description || "",
      startDate: theme.startDate || new Date().toISOString().slice(0, 10),
      endDate: theme.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      style: style,
      completed: false
    };

    setThemes(prev => [...prev, newTheme]);
    setCurrentThemeId(newTheme.id);
    await saveThemes(user.email, [newTheme]);
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      const updatedTask = { ...task, completed: !task.completed };
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      await saveTasks(user.email, [updatedTask]);
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await apiDeleteTask(id);
  };

  const completeFocusTask = () => {
    if (focusTask) {
      toggleTask(focusTask.id);
      setFocusTask(null);
    }
  };

  const getTaskStatus = (task: Task) => {
    if (task.completed) return 'completed';
    const now = new Date();
    const due = new Date(task.dueDate);
    const diff = due.getTime() - now.getTime();
    if (diff < 0) return 'overdue';
    if (diff < 24 * 60 * 60 * 1000) return 'soon';
    return 'future';
  };

  const formatDeadline = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const hasTime = isoString.includes('T');

    if (isToday) return `Today${hasTime ? ', ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: hasTime ? 'numeric' : undefined, minute: hasTime ? '2-digit' : undefined });
  };

  // --- Rendering Helpers ---

  const renderTaskCard = (task: Task) => {
    const status = getTaskStatus(task);
    const parentStory = stories.find(s => s.id === task.storyId);

    return (
      <div
        key={task.id}
        className={`group bg-white p-4 rounded-2xl border transition-all duration-200 flex items-start gap-4 hover:shadow-md 
          ${task.completed ? 'border-slate-100 opacity-60' : 'border-slate-200'}
          ${status === 'overdue' && !task.completed ? 'border-l-4 border-l-rose-500' : ''}
          ${status === 'soon' && !task.completed ? 'border-l-4 border-l-amber-400' : ''}
        `}
      >
        <button onClick={() => toggleTask(task.id)} className={`flex-shrink-0 mt-1 ${task.completed ? 'text-green-500' : `text-slate-300 hover:${themeStyle.accentColor}`}`}>
          {task.completed ? <CheckCircle2 size={24} className="fill-green-100" /> : <Circle size={24} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex flex-col min-w-0 flex-1">
              {/* Show Story Badge in List View */}
              {viewMode === 'list' && parentStory && (
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-0.5">
                  <BookOpen size={10} /> {parentStory.title}
                </span>
              )}
              <h4 className={`font-semibold truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</h4>
            </div>

            {!task.completed && (
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 flex-shrink-0
                 ${status === 'overdue' ? 'bg-rose-100 text-rose-600' :
                  status === 'soon' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                {status === 'overdue' && <AlertCircle size={10} />}
                {status === 'soon' && <Clock size={10} />}
                {formatDeadline(task.dueDate)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1 font-medium" style={{ color: CATEGORY_COLORS[task.category] }}>
              {task.category}
            </span>
            <span>•</span>
            <span>{task.estimatedMinutes}m</span>
            {task.description && <span className="hidden sm:inline">• {task.description}</span>}
          </div>

          {/* Mobile Actions (Always Visible) */}
          <div className="flex sm:hidden items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            {!task.completed && (
              <button
                onClick={() => setFocusTask(task)}
                className={`flex items-center gap-1 text-xs font-bold ${themeStyle.accentColor}`}
              >
                <Target size={16} /> Focus
              </button>
            )}
            <div className="scale-90 origin-left">
              <CalendarButton task={task} />
            </div>
            <button
              onClick={() => handleEditTask(task)}
              className="flex items-center gap-1 text-xs font-bold text-slate-400"
            >
              <Pencil size={16} /> Edit
            </button>
            <button
              onClick={() => deleteTask(task.id)}
              className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-500"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

        {/* Desktop Actions (Hover Only) */}
        <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!task.completed && (
            <button
              onClick={() => setFocusTask(task)}
              className={`p-2 hover:bg-slate-50 rounded-full transition-colors ${themeStyle.accentColor}`}
              title="Focus Mode"
            >
              <Target size={18} />
            </button>
          )}
          <CalendarButton task={task} />
          <button
            onClick={() => handleEditTask(task)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            title="Edit Task"
          >
            <Pencil size={18} />
          </button>
          <button onClick={() => deleteTask(task.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    );
  };

  if (loading || !currentTheme) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-rose-500" /></div>;
  if (focusTask) return <FocusMode task={focusTask} onComplete={completeFocusTask} onExit={() => setFocusTask(null)} />;

  const themeStyle = currentTheme.style || DEFAULT_STYLE;

  return (
    <div className={`min-h-screen transition-colors duration-700 pb-20 bg-slate-50`}>
      {/* Dynamic Background */}
      <div className={`fixed inset-0 bg-gradient-to-br ${themeStyle.gradientFrom} ${themeStyle.gradientTo} opacity-10 pointer-events-none transition-all duration-1000`}></div>

      {/* Copilot Integration */}
      <Copilot
        user={user}
        currentTheme={currentTheme}
        tasks={currentThemeTasks}
        onAddTasks={handleCopilotAddTasks}
        onAddTheme={handleCopilotAddTheme}
      />
      {/* Debug Overlay */}
      <DebugOverlay user={user} lastError={lastError} onRefresh={loadData} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${themeStyle.gradientFrom} ${themeStyle.gradientTo}`}>
                  The 29th Chapter
                </h1>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-200">
                  {user.name}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Current Era:
                </span>
                <button
                  onClick={() => setIsRoadmapOpen(true)}
                  className={`text-sm font-bold flex items-center gap-1 hover:underline ${themeStyle.accentColor}`}
                >
                  {currentTheme.title} <Map size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-slate-900">{stats.progress}% Done</p>
                <div className="w-24 h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${themeStyle.gradientFrom} ${themeStyle.gradientTo} transition-all duration-500`} style={{ width: `${stats.progress}%` }}></div>
                </div>
              </div>
              <button
                onClick={() => setIsRoadmapOpen(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg"
              >
                <Map size={16} /> Roadmap
              </button>
              <button onClick={onLogout} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {/* Quote Banner */}
        <div className="bg-slate-900 rounded-3xl p-8 mb-10 text-white relative overflow-hidden shadow-xl transition-all duration-500">
          <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${themeStyle.gradientFrom} ${themeStyle.gradientTo} rounded-full mix-blend-overlay filter blur-3xl opacity-40 -translate-y-1/3 translate-x-1/4 transition-colors duration-1000`}></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className={`inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-sm font-medium border border-white/20`}>
                <Sparkles size={14} className="text-yellow-300" />
                <span>Daily Vibe</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-display font-light leading-tight">
                "{quote}"
              </h2>
            </div>
            {/* Disable adding tasks if theme is completed */}
            <button
              onClick={() => {
                if (currentTheme.completed) {
                  alert("This era is completed! Re-open it in the Roadmap to add more tasks.");
                } else {
                  setEditingTask(null);
                  setNewTaskTitle('');
                  setNewTaskCategory(Category.CAREER);
                  setNewTaskMinutes(30);
                  const now = new Date();
                  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                  setNewTaskDate(now.toISOString().slice(0, 16));

                  setIsTaskModalOpen(true);
                  setIsCreatingNewStory(false); // Reset default state
                  setSelectedStoryId('');
                }
              }}
              className={`bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-lg flex items-center gap-2 whitespace-nowrap ${currentTheme.completed ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Plus size={20} /> Add Tasks
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Task List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                Action Plan <span className={`text-xs px-2 py-1 rounded-full ${themeStyle.bgOverlay} ${themeStyle.accentColor} border ${themeStyle.cardBorder}`}>{stats.total} Tasks</span>
              </h3>

              {/* View Toggle */}
              <div className="bg-white rounded-lg border border-slate-200 p-1 flex items-center gap-1 shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-bold ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <LayoutList size={14} /> List
                </button>
                <button
                  onClick={() => setViewMode('story')}
                  className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-bold ${viewMode === 'story' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <FolderKanban size={14} /> Story
                </button>
              </div>
            </div>

            {currentThemeTasks.length === 0 ? (
              <div className={`text-center py-20 bg-white/60 backdrop-blur rounded-3xl border-2 border-dashed ${themeStyle.cardBorder}`}>
                <Sparkles className={`mx-auto mb-4 opacity-50 ${themeStyle.accentColor}`} size={48} />
                <h3 className="text-lg font-bold text-slate-700">Era Canvas Empty</h3>
                <p className="text-slate-500 mb-6">What does "{currentTheme.title}" look like in action?</p>
                <button
                  onClick={() => !currentTheme.completed && setIsTaskModalOpen(true)}
                  className={`${themeStyle.accentColor} font-bold hover:underline disabled:opacity-50`}
                  disabled={currentTheme.completed}
                >
                  Create a task
                </button>
              </div>
            ) : (
              <div className="space-y-4">

                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {[...currentThemeTasks].sort((a, b) => {
                      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
                      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }).map(renderTaskCard)}
                  </div>
                )}

                {viewMode === 'story' && (
                  <>
                    {/* Render Tasks grouped by Story */}
                    {currentThemeStories.map(story => {
                      const storyTasks = currentThemeTasks.filter(t => t.storyId === story.id);
                      if (storyTasks.length === 0) return null;

                      return (
                        <div key={story.id} className="bg-slate-50/50 rounded-2xl p-2 border border-slate-200/60">
                          <div className="px-2 py-3 flex items-center gap-2">
                            <BookOpen size={16} className="text-slate-400" />
                            <h4 className="font-bold text-slate-700">{story.title}</h4>
                            <span className="text-xs text-slate-400">({storyTasks.length})</span>
                          </div>
                          <div className="space-y-2">
                            {storyTasks.sort((a, b) => Number(a.completed) - Number(b.completed)).map(renderTaskCard)}
                          </div>
                        </div>
                      );
                    })}

                    {/* Uncategorized Tasks */}
                    {currentThemeTasks.some(t => !t.storyId) && (
                      <div className="bg-slate-50/50 rounded-2xl p-2 border border-slate-200/60">
                        <div className="px-2 py-3 flex items-center gap-2">
                          <LayoutList size={16} className="text-slate-400" />
                          <h4 className="font-bold text-slate-700">General Tasks</h4>
                        </div>
                        <div className="space-y-2">
                          {currentThemeTasks.filter(t => !t.storyId).sort((a, b) => Number(a.completed) - Number(b.completed)).map(renderTaskCard)}
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>
            )}
          </div>

          {/* Right Column: Stats & Breakdown */}
          <div className="space-y-6">
            <div className={`bg-white p-6 rounded-3xl border ${themeStyle.cardBorder} shadow-sm`}>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className={themeStyle.accentColor.replace('text-', 'text-')} /> Focus Areas
              </h3>
              <div className="h-64">
                {stats.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data yet</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {Object.values(Category).map((cat) => (
                  <div key={cat} className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }}></div>
                    {cat}
                  </div>
                ))}
              </div>
            </div>

            <div className={`bg-gradient-to-br ${themeStyle.gradientFrom} ${themeStyle.gradientTo} rounded-3xl p-6 text-white shadow-lg`}>
              <h3 className="font-bold text-lg mb-2">Time Invested</h3>
              <p className="text-3xl font-display font-light">
                {Math.round(currentThemeTasks.reduce((acc, t) => acc + (t.completed ? t.estimatedMinutes : 0), 0) / 60)} <span className="text-base opacity-70">hours</span>
              </p>
              <p className="opacity-80 text-xs mt-2">Spent mastering this era.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Year Roadmap View (Overlay) */}
      {isRoadmapOpen && (
        <YearRoadmap
          themes={themes}
          stories={stories}
          tasks={tasks}
          currentThemeId={currentThemeId}
          onSelectTheme={(id) => {
            setCurrentThemeId(id);
          }}
          onAddTheme={() => {
            setIsRoadmapOpen(false); // Close roadmap to open modal
            openNewThemeModal();
          }}
          onEditTheme={(theme) => {
            setIsRoadmapOpen(false);
            handleEditTheme(theme);
          }}
          onDeleteTheme={handleDeleteTheme}
          onToggleComplete={handleToggleThemeComplete}
          onClose={() => setIsRoadmapOpen(false)}
        />
      )}

      {/* Add/Edit Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex border-b border-slate-100">
              <button className={`flex-1 py-4 text-center font-bold text-slate-800 border-b-2 bg-slate-50 ${themeStyle.cardBorder.replace('border-', 'border-b-')}`}>{editingTask ? 'Edit Task' : 'Add Task'}</button>
            </div>

            <div className="p-6 space-y-8">
              {/* AI Section */}
              <div className={`p-4 rounded-2xl border ${themeStyle.bgOverlay} ${themeStyle.cardBorder}`}>
                <label className={`flex items-center gap-2 font-bold mb-2 ${themeStyle.accentColor}`}>
                  <Sparkles size={16} /> AI Breakdown
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., 'Plan a solo trip to Japan'"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-300 outline-none text-sm"
                  />
                  <button
                    onClick={handleAiTaskGenerate}
                    disabled={isGeneratingTasks || !aiPrompt}
                    className={`text-white px-4 py-2 rounded-xl font-medium text-sm disabled:opacity-50 flex items-center gap-2 bg-slate-900`}
                  >
                    {isGeneratingTasks ? <Loader2 className="animate-spin" size={16} /> : 'Magic'}
                  </button>
                </div>
              </div>

              {/* Manual Form */}
              <form onSubmit={handleManualTaskSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Name</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                    placeholder="Review investment portfolio"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none"
                  />
                </div>

                {/* Story Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Story (Parent Goal)</label>
                  {!isCreatingNewStory ? (
                    <div className="flex gap-2">
                      <select
                        value={selectedStoryId}
                        onChange={(e) => setSelectedStoryId(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none bg-white"
                      >
                        <option value="">-- General Task --</option>
                        {currentThemeStories.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewStory(true)}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-bold text-xl"
                        title="Create New Story"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                      <input
                        type="text"
                        value={newStoryTitle}
                        onChange={(e) => setNewStoryTitle(e.target.value)}
                        placeholder="New Story Name (e.g. Home Reno)"
                        className="flex-1 px-4 py-3 rounded-xl border border-rose-300 ring-2 ring-rose-100 outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewStory(false)}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-bold"
                        title="Cancel"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as Category)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none bg-white"
                    >
                      {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Minutes</label>
                    <input
                      type="number"
                      value={newTaskMinutes}
                      onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                      min="5"
                      step="5"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Deadline</label>
                  <input
                    type="datetime-local"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors bg-gradient-to-r ${themeStyle.gradientFrom} ${themeStyle.gradientTo}`}
                  >
                    {editingTask ? 'Update Task' : 'Add Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Theme Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 p-6 text-white">
              <h2 className="text-2xl font-display font-bold">{editingTheme ? 'Edit Era' : 'Define Your Next Era'}</h2>
              <p className="text-slate-400 text-sm">{editingTheme ? 'Update the details of this chapter.' : 'Create a new chapter for 2026.'}</p>
            </div>

            <form onSubmit={handleThemeSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Era Name</label>
                <input
                  type="text"
                  value={newThemeTitle}
                  onChange={(e) => setNewThemeTitle(e.target.value)}
                  required
                  placeholder="e.g. Winter Arc, Soft Girl Spring, CEO Summer"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">The Vibe (for AI Styling)</label>
                <textarea
                  value={newThemeDesc}
                  onChange={(e) => setNewThemeDesc(e.target.value)}
                  required
                  placeholder="Describe the energy. e.g. 'Intense focus, waking up early, dark mode vibes' or 'Playful, colorful, energetic travel'."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-800 outline-none resize-none h-24"
                />
                <p className="text-[10px] text-slate-400 mt-1">Changing the vibe will regenerate the color theme.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newThemeStart}
                    onChange={(e) => setNewThemeStart(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={newThemeEnd}
                    onChange={(e) => setNewThemeEnd(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingTheme}
                  className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  {isGeneratingTheme ? <Loader2 className="animate-spin" /> : (editingTheme ? 'Update Era' : 'Create Era')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;