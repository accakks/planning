import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Task, Category, ChartData, Theme, ThemeStyle, Story } from '../types';
import { getTasks, saveTasks, getThemes, saveThemes, getStories, saveStories, deleteTask as apiDeleteTask, deleteTheme as apiDeleteTheme, deleteStory as apiDeleteStory } from '../services/storage';
import { generateSubtasks, getMotivationalQuote, generateThemeStyle, generateTaskChecklist, analyzeTask } from '../services/gemini';
import { Plus, Trash2, CheckCircle2, Circle, Loader2, LogOut, Sparkles, TrendingUp, Target, Clock, AlertCircle, Calendar, Map, LayoutList, FolderKanban, BookOpen, X, Pencil, ChevronDown, ChevronUp, Pin, Search, Filter, Eye, EyeOff } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import CalendarButton from './CalendarButton';
import TaskCard from './TaskCard';
import FocusMode from './FocusMode';
import YearRoadmap from './YearRoadmap';
import Copilot from './Copilot';
import ReanalyzeModal from './ReanalyzeModal';
import { updateTaskRemainingTime } from '../services/storage';



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


interface StorySectionProps {
  story: Story;
  taskCount: number;
  onAddTask: () => void;
  onToggleImportant: () => void;
  children: React.ReactNode;
}

const StorySection: React.FC<StorySectionProps> = ({ story, taskCount, onAddTask, onToggleImportant, children }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="group bg-slate-50/50 rounded-2xl p-2 border border-slate-200/60 transition-all duration-300 hover:border-slate-300">
      <div
        className="px-2 py-3 flex items-center justify-between cursor-pointer select-none rounded-xl hover:bg-slate-100/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <button className="text-slate-400 transition-transform duration-200">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <BookOpen size={16} className="text-slate-400" />
          <h4 className="font-bold text-slate-700">{story.title}</h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleImportant();
            }}
            className={`p-1 transition-colors rounded ${story.isImportant ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'}`}
            title={story.isImportant ? 'Unpin Story' : 'Pin Story to Top'}
          >
            <Pin size={14} className={story.isImportant ? 'fill-amber-500' : ''} />
          </button>
          <span className="text-xs text-slate-400">({taskCount})</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddTask();
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-all shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-100"
          title="Add Task to this Story"
        >
          <Plus size={16} />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2 mt-1 animate-in slide-in-from-top-1 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
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
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Story selection in Task Modal
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [isCreatingNewStory, setIsCreatingNewStory] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryDesc, setNewStoryDesc] = useState('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isAnalyzingTask, setIsAnalyzingTask] = useState(false);
  const [lastAnalyzedTitle, setLastAnalyzedTitle] = useState('');
  const [newSubtasks, setNewSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newTaskIsImportant, setNewTaskIsImportant] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<Category | 'All'>('All');
  const [hideCompleted, setHideCompleted] = useState(false);

  // Selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isReanalyzeModalOpen, setIsReanalyzeModalOpen] = useState(false);

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedTaskIds([]);
    setIsSelectMode(false);
  };

  const openAddTaskModal = (storyId?: string) => {
    if (currentTheme.completed) {
      alert("This era is completed! Re-open it in the Roadmap to add more tasks.");
      return;
    }
    setEditingTask(null);
    setNewTaskTitle('');
    setNewTaskCategory(Category.CAREER);
    setNewTaskMinutes(30);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setNewTaskDate(now.toISOString().slice(0, 16));
    setNewTaskDesc('');

    setIsTaskModalOpen(true);
    setIsCreatingNewStory(false);
    setSelectedStoryId(storyId || '');
    setNewStoryTitle('');
    setNewStoryDesc('');
    setNewSubtasks([]);
    setNewTaskIsImportant(false);
  };

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

  // Available stories (global)
  const availableStories = useMemo(() =>
    stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    , [stories]);

  const filteredTasks = useMemo(() => {
    return currentThemeTasks.filter(task => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = selectedFilterCategory === 'All' || task.category === selectedFilterCategory;

      // Completion filter
      const matchesCompletion = !hideCompleted || !task.completed;

      return matchesSearch && matchesCategory && matchesCompletion;
    });
  }, [currentThemeTasks, searchQuery, selectedFilterCategory, hideCompleted]);

  const stats = useMemo(() => {
    const total = currentThemeTasks.length;
    const completed = currentThemeTasks.filter(t => t.completed).length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    const data: ChartData[] = Object.values(Category).map(cat => ({
      name: cat,
      value: currentThemeTasks
        .filter(t => t.category === cat)
        .reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0),
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
    setNewTaskDesc(task.description || '');
    setSelectedStoryId(task.storyId || '');
    setIsCreatingNewStory(false);
    setNewStoryTitle('');
    setNewStoryDesc('');
    setNewSubtasks(task.subtasks || []);
    setNewTaskIsImportant(task.isImportant || false);
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
        description: newStoryDesc,
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
        description: newTaskDesc,
        category: newTaskCategory,
        estimatedMinutes: newTaskMinutes,
        dueDate: newTaskDate,
        storyId: finalStoryId || undefined,
        subtasks: newSubtasks,
        isImportant: newTaskIsImportant,
      };
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
      await saveTasks(user.email, [updatedTask]);
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        themeId: currentThemeId,
        storyId: finalStoryId || undefined,
        title: newTaskTitle,
        description: newTaskDesc,
        category: newTaskCategory,
        estimatedMinutes: newTaskMinutes,
        dueDate: newTaskDate,
        completed: false,
        subtasks: newSubtasks,
        isImportant: newTaskIsImportant,
      };
      setTasks(prev => [...prev, newTask]);
      await saveTasks(user.email, [newTask]);
    }

    // Reset
    setEditingTask(null);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setSelectedStoryId('');
    setIsCreatingNewStory(false);
    setNewStoryTitle('');
    setNewStoryDesc('');
    setNewSubtasks([]);
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

  const handleAiAnalyzeTask = async (taskTitle: string) => {
    // Only analyze if title is long enough and hasn't been analyzed yet
    if (!taskTitle || taskTitle.length <= 4 || taskTitle === lastAnalyzedTitle) return;

    setIsAnalyzingTask(true);
    setLastAnalyzedTitle(taskTitle);

    try {
      const result = await analyzeTask(taskTitle, stories);

      setNewTaskMinutes(result.estimatedMinutes);
      setNewTaskCategory(result.category);
      if (result.storyId) {
        setSelectedStoryId(result.storyId);
      }
    } catch (error) {
      console.error("Failed to analyze task", error);
    } finally {
      setIsAnalyzingTask(false);
    }
  };

  // Debounced effect to trigger AI analysis
  useEffect(() => {
    if (!isTaskModalOpen || editingTask) return; // Only for new tasks

    const timer = setTimeout(() => {
      handleAiAnalyzeTask(newTaskTitle);
    }, 1500); // 1.5 second delay

    return () => clearTimeout(timer);
  }, [newTaskTitle, isTaskModalOpen, editingTask]);


  const handleGenerateSubtasksForModal = async () => {
    if (!newTaskTitle) return;
    setIsGeneratingSubtasks(true);
    try {
      const parentStory = selectedStoryId ? stories.find(s => s.id === selectedStoryId) : undefined;
      const storyContext = parentStory?.title;
      const storyDescription = parentStory?.description;

      const generatedSubtasks = await generateTaskChecklist(
        newTaskTitle,
        newTaskCategory,
        storyContext,
        newTaskDesc,
        storyDescription
      );

      // Map to include id and completed fields
      const subtasksWithIds = generatedSubtasks.map((st: any) => ({
        id: crypto.randomUUID(),
        title: st.title,
        completed: false,
      }));

      setNewSubtasks(subtasksWithIds);
    } catch (error) {
      console.error("Failed to generate subtasks", error);
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleCopilotAddTasks = async (suggestedTasks: Partial<Task>[]) => {
    const now = new Date();
    const tasksToUpdate: Task[] = [];
    const tasksToCreate: Task[] = [];

    suggestedTasks.forEach(t => {
      // Smart Story Resolution: Try to find by ID first, then by title
      let resolvedStoryId = t.storyId;
      if (resolvedStoryId) {
        const foundById = stories.find(s => s.id === resolvedStoryId);
        if (!foundById) {
          const foundByTitle = stories.find(s => s.title.toLowerCase() === resolvedStoryId?.toLowerCase());
          if (foundByTitle) resolvedStoryId = foundByTitle.id;
          else resolvedStoryId = undefined; // Fallback if no match
        }
      }

      // Sanitize Subtasks: Ensure they have proper UUIDs
      const sanitizedSubtasks = t.subtasks?.map(st => ({
        id: (st.id && st.id.length > 20) ? st.id : crypto.randomUUID(), // Only keep if it looks like a real UUID
        title: st.title || "Step",
        completed: !!st.completed
      }));

      // Check if this is an update to an existing task
      const existingTask = t.id ? tasks.find(et => et.id === t.id) : null;

      if (existingTask) {
        tasksToUpdate.push({
          ...existingTask,
          title: t.title || existingTask.title,
          description: t.description !== undefined ? t.description : existingTask.description,
          category: t.category || existingTask.category,
          estimatedMinutes: t.estimatedMinutes || existingTask.estimatedMinutes,
          dueDate: t.dueDate || existingTask.dueDate,
          storyId: resolvedStoryId !== undefined ? resolvedStoryId : existingTask.storyId,
          subtasks: sanitizedSubtasks || existingTask.subtasks
        });
      } else {
        tasksToCreate.push({
          id: crypto.randomUUID(),
          themeId: currentThemeId,
          storyId: resolvedStoryId,
          title: t.title || "New Idea",
          description: t.description || "",
          category: t.category || Category.PERSONAL,
          estimatedMinutes: t.estimatedMinutes || 30,
          dueDate: t.dueDate || (now.toISOString().slice(0, 10) + 'T23:59'),
          completed: false,
          isAiGenerated: true,
          subtasks: sanitizedSubtasks
        } as Task);
      }
    });

    if (tasksToUpdate.length > 0 || tasksToCreate.length > 0) {
      setTasks(prev => {
        let updatedList = [...prev];

        // Apply updates
        tasksToUpdate.forEach(updatedTask => {
          updatedList = updatedList.map(t => t.id === updatedTask.id ? updatedTask : t);
        });

        // Add new ones
        return [...tasksToCreate, ...updatedList];
      });

      // Save all changes to storage
      await saveTasks(user.email, [...tasksToUpdate, ...tasksToCreate]);
    }
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

  const handleCopilotAddStory = async (story: Partial<Story>) => {
    if (!story.title) return;

    const newStory: Story = {
      id: crypto.randomUUID(),
      themeId: currentThemeId,
      title: story.title,
      description: story.description,
      createdAt: new Date().toISOString()
    };

    setStories(prev => [...prev, newStory]);
    await saveStories(user.email, [newStory]);
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      const updatedTask = { ...task, completed: !task.completed };
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
      await saveTasks(user.email, [updatedTask]);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const updatedTask = { ...task, subtasks: updatedSubtasks };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    await saveTasks(user.email, [updatedTask]);
  };

  const handleAddSubtask = async (taskId: string, title: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !title) return;

    const newSubtask = {
      id: crypto.randomUUID(),
      title,
      completed: false
    };

    const updatedTask = { ...task, subtasks: [...(task.subtasks || []), newSubtask] };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    await saveTasks(user.email, [updatedTask]);
  };

  const handleEditSubtask = async (taskId: string, subtaskId: string, newTitle: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, title: newTitle } : st
    );

    const updatedTask = { ...task, subtasks: updatedSubtasks };

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    // Save to DB
    await saveTasks(user.email, [updatedTask]);
  };

  const handleToggleTaskImportant = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, isImportant: !task.isImportant };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    await saveTasks(user.email, [updatedTask]);
  };

  const handleToggleStoryImportant = async (storyId: string) => {
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const updatedStory = { ...story, isImportant: !story.isImportant };
    setStories(prev => prev.map(s => s.id === storyId ? updatedStory : s));
    await saveStories(user.email, [updatedStory]);
  };

  const handleUpdateTaskWithSuggestion = async (taskId: string, suggestion: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...suggestion } : t));
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await saveTasks(user.email, [{ ...task, ...suggestion }]);
    }
  };

  const handleGenerateChecklist = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Find context
    const story = stories.find(s => s.id === task.storyId);

    // Optimistic UI for loading state could be added here if needed
    // For now we'll just try to fetch
    try {
      // AI Call with context
      const checklist = await generateTaskChecklist(
        task.title,
        task.category,
        story?.title,
        task.description,
        story?.description
      );

      const newSubtasks = checklist.map((item: any) => ({
        id: crypto.randomUUID(),
        title: item.title,
        completed: false
      }));

      const updatedTask = { ...task, subtasks: [...(task.subtasks || []), ...newSubtasks] };
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      await saveTasks(user.email, [updatedTask]);
    } catch (e) {
      console.error("Failed to generate checklist", e);
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await apiDeleteTask(id);
  };

  const handleUpdateTaskRemainingTime = async (taskId: string, minutes: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, remainingMinutes: minutes } : t));
    try {
      await updateTaskRemainingTime(taskId, minutes);
    } catch (error) {
      console.error('Failed to sync remaining time:', error);
    }
  };

  const completeFocusTask = async () => {
    if (focusTask) {
      const taskId = focusTask.id;
      toggleTask(taskId);
      // Also clear remaining time in DB when completed
      await updateTaskRemainingTime(taskId, 0);
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
    const [isExpanded, setIsExpanded] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const completedSubtasks = (task.subtasks || []).filter(st => st.completed).length;
    const totalSubtasks = (task.subtasks || []).length;
    const progress = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

    return (
      <div
        key={task.id}
        className={`group bg-white p-4 rounded-2xl border transition-all duration-200 hover:shadow-md 
          ${task.completed ? 'border-slate-100 opacity-60' : 'border-slate-200'}
          ${status === 'overdue' && !task.completed ? 'border-l-4 border-l-rose-500' : ''}
          ${status === 'soon' && !task.completed ? 'border-l-4 border-l-amber-400' : ''}
        `}
      >
        <div className="flex items-start gap-4">
          <button onClick={() => toggleTask(task.id)} className={`flex-shrink-0 mt-1 ${task.completed ? 'text-green-500' : `text-slate-300 hover:${themeStyle.accentColor}`}`}>
            {task.completed ? <CheckCircle2 size={24} className="fill-green-100" /> : <Circle size={24} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-col min-w-0 flex-1">
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

            {/* Subtasks Summary / Toggle */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"
              >
                {totalSubtasks > 0 ? (
                  <>
                    {/* Progress Bar */}
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span>{completedSubtasks}/{totalSubtasks}</span>
                  </>
                ) : (
                  <span>Add Checklist</span>
                )}
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* CheckList Section */}
            {isExpanded && (
              <div className="mt-3 pl-2 border-l-2 border-slate-100 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {(task.subtasks || []).map(st => (
                  <div key={st.id} className="flex items-center gap-2 group/sub">
                    <button
                      onClick={() => handleToggleSubtask(task.id, st.id)}
                      className={`text-slate-300 hover:text-slate-500 ${st.completed ? 'text-green-500' : ''}`}
                    >
                      {st.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                    <span className={`text-sm ${st.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {st.title}
                    </span>
                  </div>
                ))}

                {/* Add Subtask Input */}
                <div className="flex items-center gap-2 pt-1">
                  <Plus size={16} className="text-slate-300" />
                  <input
                    type="text"
                    className="text-sm bg-transparent border-none focus:ring-0 p-0 placeholder:text-slate-400 text-slate-700 w-full"
                    placeholder="Add step..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddSubtask(task.id, newSubtaskTitle);
                        setNewSubtaskTitle('');
                      }
                    }}
                  />
                  {/* AI Generate Button (only if no subtasks yet to keep it clean, or always?) */}
                  {totalSubtasks === 0 && (
                    <button
                      onClick={() => handleGenerateChecklist(task.id)}
                      className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-purple-100 transition-colors whitespace-nowrap"
                      title="Auto-generate steps"
                    >
                      <Sparkles size={10} /> AI Steps
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Actions */}
            <div className="flex sm:hidden items-center gap-4 mt-3 pt-3 border-t border-slate-100">
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

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <CalendarButton task={task} />
            <button
              onClick={() => handleEditTask(task)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <Pencil size={18} />
            </button>
            <button onClick={() => deleteTask(task.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading || !currentTheme) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-rose-500" /></div>;
  if (focusTask) return (
    <FocusMode
      task={focusTask}
      onComplete={completeFocusTask}
      onExit={(timeLeftMinutes) => {
        handleUpdateTaskRemainingTime(focusTask.id, timeLeftMinutes);
        setFocusTask(null);
      }}
      onUpdateProgress={(timeLeftMinutes) => handleUpdateTaskRemainingTime(focusTask.id, timeLeftMinutes)}
    />
  );

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
        stories={availableStories}
        onAddTasks={handleCopilotAddTasks}
        onAddTheme={handleCopilotAddTheme}
        onAddStory={handleCopilotAddStory}
      />


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

        {/* Selection Banner */}
        {selectedTaskIds.length > 0 && (
          <div className="mb-6 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-2.5 rounded-xl">
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-lg">{selectedTaskIds.length} tasks selected</p>
                <p className="text-sm text-slate-400">AI can review these for focus time and deadline concerns.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={clearSelection}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsReanalyzeModalOpen(true)}
                className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-lg active:scale-95"
              >
                <Sparkles size={18} /> Reanalyze Estimates
              </button>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Task List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                Action Plan <span className={`text-xs px-2 py-1 rounded-full ${themeStyle.bgOverlay} ${themeStyle.accentColor} border ${themeStyle.cardBorder}`}>{stats.total} Tasks</span>
              </h3>
              <button
                onClick={() => openAddTaskModal()}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm
                    ${themeStyle.accentColor} ${themeStyle.bgOverlay} border ${themeStyle.cardBorder} hover:brightness-95
                    ${currentTheme.completed ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={currentTheme.completed}
              >
                <Plus size={14} /> Add Tasks
              </button>
              <button
                onClick={() => setIsSelectMode(!isSelectMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm border
                    ${isSelectMode ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 bg-white border-slate-200 hover:border-slate-300'}`}
              >
                {isSelectMode ? 'Cancel Selection' : 'Select Tasks'}
              </button>
            </div>

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

            {/* Filter Bar */}

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  <select
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl text-sm pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-200 outline-none appearance-none cursor-pointer"
                    value={selectedFilterCategory}
                    onChange={(e) => setSelectedFilterCategory(e.target.value as Category | 'All')}
                  >
                    <option value="All">All Areas</option>
                    {Object.values(Category).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setHideCompleted(!hideCompleted)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all border shrink-0
                    ${hideCompleted
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  title={hideCompleted ? "Show completed tasks" : "Hide completed tasks"}
                >
                  {hideCompleted ? <EyeOff size={16} /> : <Eye size={16} />}
                  <span className="hidden sm:inline">{hideCompleted ? 'Done Hidden' : 'Hide Done'}</span>
                </button>

                {(searchQuery || selectedFilterCategory !== 'All' || hideCompleted) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedFilterCategory('All');
                      setHideCompleted(false);
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                    title="Clear all filters"
                  >
                    <X size={20} />
                  </button>
                )}
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
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-20 bg-white/40 backdrop-blur rounded-3xl border border-slate-200">
                <Search className="mx-auto mb-4 text-slate-300" size={48} />
                <h3 className="text-lg font-bold text-slate-700">No matching tasks</h3>
                <p className="text-slate-500 mb-6">Adjust your filters to see more results.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFilterCategory('All');
                    setHideCompleted(false);
                  }}
                  className="text-slate-900 font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">

                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {[...filteredTasks].sort((a, b) => {
                      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);

                      const aStory = stories.find(s => s.id === a.storyId);
                      const bStory = stories.find(s => s.id === b.storyId);
                      const aIsImportant = a.isImportant || aStory?.isImportant;
                      const bIsImportant = b.isImportant || bStory?.isImportant;

                      if (aIsImportant !== bIsImportant) return Number(bIsImportant || false) - Number(aIsImportant || false);
                      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }).map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        stories={stories}
                        viewMode={viewMode}
                        themeStyle={currentTheme.style}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={handleEditTask}
                        onFocus={setFocusTask}
                        onToggleSubtask={handleToggleSubtask}
                        onToggleImportant={handleToggleTaskImportant}
                        isSelectMode={isSelectMode}
                        isSelected={selectedTaskIds.includes(task.id)}
                        onToggleSelection={toggleTaskSelection}
                      />
                    ))}
                  </div>
                )}

                {viewMode === 'story' && (
                  <>
                    {/* Render Tasks grouped by Story */}
                    {availableStories.sort((a, b) => {
                      const aHasImportant = a.isImportant || filteredTasks.some(t => t.storyId === a.id && t.isImportant);
                      const bHasImportant = b.isImportant || filteredTasks.some(t => t.storyId === b.id && t.isImportant);
                      return Number(bHasImportant) - Number(aHasImportant);
                    }).map(story => {
                      const storyTasks = filteredTasks.filter(t => t.storyId === story.id);
                      if (storyTasks.length === 0) return null;

                      return (
                        <StorySection
                          key={story.id}
                          story={story}
                          taskCount={storyTasks.length}
                          onAddTask={() => openAddTaskModal(story.id)}
                          onToggleImportant={() => handleToggleStoryImportant(story.id)}
                        >
                          {storyTasks.sort((a, b) => {
                            if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);

                            const aIsImportant = a.isImportant || story.isImportant;
                            const bIsImportant = b.isImportant || story.isImportant;

                            if (aIsImportant !== bIsImportant) return Number(bIsImportant || false) - Number(aIsImportant || false);
                            return 0;
                          }).map(task => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              stories={stories}
                              viewMode={viewMode}
                              themeStyle={themeStyle}
                              onToggle={toggleTask}
                              onDelete={deleteTask}
                              onEdit={handleEditTask}
                              onFocus={setFocusTask}
                              onToggleSubtask={handleToggleSubtask}
                              onToggleImportant={handleToggleTaskImportant}
                            />
                          ))}
                        </StorySection>
                      );
                    })}

                    {/* Uncategorized Tasks */}
                    {filteredTasks.some(t => !t.storyId) && (
                      <div className="bg-slate-50/50 rounded-2xl p-2 border border-slate-200/60">
                        <div className="px-2 py-3 flex items-center gap-2">
                          <LayoutList size={16} className="text-slate-400" />
                          <h4 className="font-bold text-slate-700">General Tasks</h4>
                        </div>
                        <div className="space-y-2">
                          {filteredTasks.filter(t => !t.storyId).sort((a, b) => Number(a.completed) - Number(b.completed)).map(task => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              stories={stories}
                              viewMode={viewMode}
                              themeStyle={themeStyle}
                              onToggle={toggleTask}
                              onDelete={deleteTask}
                              onEdit={handleEditTask}
                              onFocus={setFocusTask}
                              onToggleSubtask={handleToggleSubtask}
                              onToggleImportant={handleToggleTaskImportant}
                            />
                          ))}
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
            {/* Daily Vibe Sidebar Card */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl transition-all duration-500 min-h-[160px] flex flex-col justify-center">
              <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${themeStyle.gradientFrom} ${themeStyle.gradientTo} rounded-full mix-blend-overlay filter blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2 transition-colors duration-1000`}></div>

              <div className="relative z-10">
                <div className={`inline-flex items-center gap-2 mb-3 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur text-[10px] font-bold uppercase tracking-wider border border-white/20`}>
                  <Sparkles size={10} className="text-yellow-300" />
                  <span>Daily Vibe</span>
                </div>
                <h2 className="text-lg font-display font-light leading-snug italic">
                  "{quote}"
                </h2>
              </div>
            </div>

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

      {
        isRoadmapOpen && (
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
        )
      }

      {/* Add/Edit Task Modal */}
      {
        isTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex border-b border-slate-100">
                <button className={`flex-1 py-4 text-center font-bold text-slate-800 border-b-2 bg-slate-50 ${themeStyle.cardBorder.replace('border-', 'border-b-')}`}>{editingTask ? 'Edit Task' : 'Add Task'}</button>
              </div>

              <div className="p-6 space-y-8">
                {/* Manual Form */}
                <form onSubmit={handleManualTaskSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onBlur={() => handleAiAnalyzeTask(newTaskTitle)}
                        required
                        placeholder="Review investment portfolio"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none pr-10"
                      />
                      {isAnalyzingTask && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600">
                          <Loader2 className="animate-spin" size={20} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Description</label>
                    <textarea
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      placeholder="Add details about this task..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none resize-none h-20"
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
                          {availableStories.map(s => (
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
                      <>
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
                        <div className="mt-2 animate-in fade-in slide-in-from-right-2 duration-200">
                          <textarea
                            value={newStoryDesc}
                            onChange={(e) => setNewStoryDesc(e.target.value)}
                            placeholder="What is this story about? (e.g. Goals, context)"
                            className="w-full px-4 py-3 rounded-xl border border-rose-300 ring-2 ring-rose-100 outline-none resize-none h-20"
                          />
                        </div>
                      </>
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

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                    <input
                      type="checkbox"
                      id="isImportant"
                      checked={newTaskIsImportant}
                      onChange={(e) => setNewTaskIsImportant(e.target.checked)}
                      className="w-5 h-5 rounded text-rose-500 focus:ring-rose-500 border-slate-300 transition-all cursor-pointer"
                    />
                    <label htmlFor="isImportant" className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-500" /> Mark as Important
                    </label>
                  </div>

                  {/* Subtasks Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase">Subtasks</label>
                      <button
                        type="button"
                        onClick={handleGenerateSubtasksForModal}
                        disabled={isGeneratingSubtasks || !newTaskTitle}
                        className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-purple-100 transition-colors disabled:opacity-50"
                      >
                        {isGeneratingSubtasks ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                        Generate Subtasks
                      </button>
                    </div>

                    {/* Subtasks List */}
                    <div className="space-y-2 mb-2">
                      {newSubtasks.map((subtask, index) => (
                        <div key={subtask.id} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl group">
                          <Circle size={14} className="text-slate-300 flex-shrink-0" />
                          <input
                            type="text"
                            value={subtask.title}
                            onChange={(e) => {
                              const updated = [...newSubtasks];
                              updated[index] = { ...subtask, title: e.target.value };
                              setNewSubtasks(updated);
                            }}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setNewSubtasks(newSubtasks.filter((_, i) => i !== index));
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Subtask Input */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewSubtasks([...newSubtasks, { id: crypto.randomUUID(), title: '', completed: false }]);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Plus size={14} /> Add subtask
                    </button>
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
        )
      }

      {/* Add/Edit Theme Modal */}
      {
        isThemeModalOpen && (
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
        )
      }
      <ReanalyzeModal
        isOpen={isReanalyzeModalOpen}
        onClose={() => setIsReanalyzeModalOpen(false)}
        selectedTasks={tasks.filter(t => selectedTaskIds.includes(t.id))}
        onApprove={handleUpdateTaskWithSuggestion}
      />
    </div >
  );
};

export default Dashboard;