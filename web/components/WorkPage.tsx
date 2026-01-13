import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Plus, Trash2, Calendar, X, Pencil, Clock } from 'lucide-react';
import { Task, Category, Theme, ThemeStyle } from '@shared/types';
import { getTasks, saveTasks, getThemes, saveThemes, deleteTask as apiDeleteTask } from '@shared/services/storage';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const PHASES = [
    { name: "Phase 1: High Leverage", type: 'L', subtext: "Tasks that move the needle significantly. Deep focus." },
    { name: "Phase 2: Technical & Execution", type: 'N', subtext: "Focus on 'Good Enough' & functionality." },
    { name: "Phase 3: The Blitz", type: 'O', subtext: "Batch these together and clear rapidly." }
];

const COLORS = {
    L: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
    N: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
    O: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
};

const ICONS = {
    L: '🚀',
    N: '🛠️',
    O: '🧹'
} as const;

// Default style fallback (borrowed from Dashboard)
const DEFAULT_STYLE: ThemeStyle = {
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-orange-500',
    accentColor: 'text-rose-600',
    bgOverlay: 'bg-rose-50',
    cardBorder: 'border-rose-200'
};

const WorkPage: React.FC = () => {
    // --- State ---
    const [tasks, setTasks] = useState<Task[]>([]);
    const [currentThemeId, setCurrentThemeId] = useState<string>('');
    const [filter, setFilter] = useState<'all' | 'L' | 'N' | 'O'>('all');
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [formData, setFormData] = useState<{ title: string; desc: string; type: 'L' | 'N' | 'O'; deadline: string }>({
        title: '', desc: '', type: 'L', deadline: ''
    });

    // --- Load Data & Migration ---
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // 1. Fetch Themes to determine active theme
                const themes = await getThemes();
                let activeTheme = themes.find(t => {
                    const today = new Date().toISOString().split('T')[0];
                    return today >= t.startDate && today <= t.endDate;
                }) || themes[themes.length - 1];

                // Create default theme if absolutely none exist
                if (!activeTheme) {
                    activeTheme = {
                        id: crypto.randomUUID(),
                        title: "2026 Kickoff",
                        description: "Starting the year with high energy and focus.",
                        startDate: "2026-01-01",
                        endDate: "2026-02-15",
                        style: DEFAULT_STYLE
                    };
                    await saveThemes('', [activeTheme]);
                }
                setCurrentThemeId(activeTheme.id);

                // 2. Fetch DB Tasks
                const dbTasks = await getTasks();
                let allTasks = dbTasks;

                // 3. Check and Migrate LocalStorage
                const localSaved = localStorage.getItem('lno-session-tasks');
                if (localSaved) {
                    try {
                        const localTasks = JSON.parse(localSaved); // These are the old LNOTask shape
                        if (Array.isArray(localTasks) && localTasks.length > 0) {

                            const migratedTasks: Task[] = localTasks.map((lt: any) => ({
                                id: crypto.randomUUID(),
                                themeId: activeTheme!.id, // Assign to active theme
                                title: lt.text || "Untitled Task",
                                description: lt.desc || "",
                                category: Category.CAREER, // Default category
                                estimatedMinutes: 30, // Default duration
                                dueDate: lt.deadline || new Date().toISOString(),
                                completed: lt.completed || false,
                                isAiGenerated: false,
                                lnoType: lt.type as 'L' | 'N' | 'O',
                                subtasks: []
                            }));

                            // Save migrated tasks to DB
                            await saveTasks('', migratedTasks);

                            // Merge with existing DB tasks for view
                            allTasks = [...dbTasks, ...migratedTasks];

                            // Clear local storage
                            localStorage.removeItem('lno-session-tasks');
                            console.log("Migrated local tasks to Supabase");
                        }
                    } catch (err) {
                        console.error("Migration failed", err);
                    }
                }

                // Filter to show only tasks that have an LNO type assigned (or all if you prefer mixed view)
                // For this page, we primarily want LNO tasks.
                const workSessionTasks = allTasks.filter(t => t.lnoType);
                setTasks(workSessionTasks);

            } catch (e) {
                console.error("Failed to load work data", e);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);


    // --- Handlers ---
    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            const updatedTask = { ...task, completed: !task.completed };
            // Optimistic update
            setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
            // Sync
            await saveTasks('', [updatedTask]);
        }
    };

    const deleteTask = async (id: string) => {
        if (window.confirm("Delete this task?")) {
            setTasks(prev => prev.filter(t => t.id !== id));
            await apiDeleteTask(id);
        }
    };

    const openAddModal = () => {
        setEditingTask(null);
        setFormData({ title: '', desc: '', type: 'L', deadline: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            desc: task.description || '',
            type: task.lnoType || 'L',
            deadline: task.dueDate || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) return;

        let taskToSave: Task;

        if (editingTask) {
            taskToSave = {
                ...editingTask,
                title: formData.title,
                description: formData.desc,
                lnoType: formData.type,
                dueDate: formData.deadline || editingTask.dueDate
            };
            setTasks(prev => prev.map(t => t.id === editingTask.id ? taskToSave : t));
        } else {
            taskToSave = {
                id: crypto.randomUUID(),
                themeId: currentThemeId,
                title: formData.title,
                description: formData.desc,
                category: Category.CAREER, // Default
                estimatedMinutes: 30,
                dueDate: formData.deadline || new Date().toISOString(),
                completed: false,
                isAiGenerated: false,
                lnoType: formData.type,
            };
            setTasks(prev => [...prev, taskToSave]);
        }

        await saveTasks('', [taskToSave]);
        setIsModalOpen(false);
    };

    const addToCalendar = (task: Task) => {
        const title = encodeURIComponent(task.title);
        const details = encodeURIComponent(task.description || '');

        let startIso, endIso;

        // Use dueDate if present, otherwise now + 1hr
        const targetDate = task.dueDate ? new Date(task.dueDate) : new Date(Date.now() + 3600000);
        // Default duration 1 hour ending at target date if date is future, else starting now.
        // Simplified: Start = Target - 1h, End = Target.

        const endDate = targetDate;
        const startDate = new Date(endDate.getTime() - 60 * 60 * 1000);

        const format = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        startIso = format(startDate);
        endIso = format(endDate);

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startIso}/${endIso}`;
        window.open(url, '_blank');
    };

    const filteredTasks = tasks.filter(t => filter === 'all' || t.lnoType === filter);

    // --- Stats ---
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const countL = tasks.filter(t => t.lnoType === 'L').length;
    const countN = tasks.filter(t => t.lnoType === 'N').length;
    const countO = tasks.filter(t => t.lnoType === 'O').length;

    // --- Chart Data ---
    const distribData = {
        labels: ['Leverage (Strategy)', 'Neutral (Execution)', 'Overhead (Chores)'],
        datasets: [{
            data: [countL, countN, countO],
            backgroundColor: ['#fbbf24', '#60a5fa', '#34d399'],
            borderWidth: 0,
        }]
    };

    const distribOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { usePointStyle: true, padding: 20, font: { size: 11 } }
            }
        }
    };

    const statusData = {
        labels: ['L', 'N', 'O'],
        datasets: [
            {
                label: 'Completed',
                data: [
                    tasks.filter(t => t.lnoType === 'L' && t.completed).length,
                    tasks.filter(t => t.lnoType === 'N' && t.completed).length,
                    tasks.filter(t => t.lnoType === 'O' && t.completed).length,
                ],
                backgroundColor: '#6366f1',
            },
            {
                label: 'Pending',
                data: [
                    tasks.filter(t => t.lnoType === 'L' && !t.completed).length,
                    tasks.filter(t => t.lnoType === 'N' && !t.completed).length,
                    tasks.filter(t => t.lnoType === 'O' && !t.completed).length,
                ],
                backgroundColor: '#e2e8f0',
            }
        ]
    };

    const statusOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, display: false }
        },
        plugins: { legend: { display: false } }
    };


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-full">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">🚀 Work Session</h1>
                        <p className="text-sm text-slate-500">Manage your prioritized work session with the LNO Framework.</p>
                    </div>
                    <div className="w-full md:w-1/3 flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <span>Session Progress</span>
                            <span id="progress-text">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Context & Stats */}
                <div className="lg:col-span-1 space-y-6">

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
                        <h2 className="text-lg font-bold mb-2 text-slate-800">Session Strategy</h2>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4">
                            Welcome to your evening session. This dashboard is organized using the <strong>LNO Framework</strong>.
                            Prioritize <strong>Leverage</strong> (L) tasks for maximum impact, maintain quality on <strong>Neutral</strong> (N) tasks, and blitz through <strong>Overhead</strong> (O) chores.
                        </p>
                        <div className="flex gap-2 text-xs font-medium flex-wrap">
                            <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200">L: High Impact</span>
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 border border-blue-200">N: Execution</span>
                            <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">O: Chores</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <button
                                onClick={openAddModal}
                                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Plus size={18} /> Add New Task
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
                        <h3 className="text-md font-semibold mb-4 text-slate-700">Workload Distribution</h3>
                        <div className="relative w-full h-[250px]">
                            <Doughnut data={distribData} options={distribOptions} />
                        </div>

                        <div className="mt-8">
                            <h3 className="text-md font-semibold mb-2 text-slate-700">Completion Status</h3>
                            <div className="relative w-full h-[180px]">
                                <Bar data={statusData} options={statusOptions} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: The Checklist */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Filters */}
                    <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-lg self-start">
                        {(['all', 'L', 'N', 'O'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-white shadow text-slate-800'
                                    : 'text-slate-600 hover:bg-white hover:shadow'
                                    }`}
                            >
                                {f === 'all' ? 'All Tasks' : `${ICONS[f as 'L' | 'N' | 'O']} ${f === 'L' ? 'Leverage' : f === 'N' ? 'Neutral' : 'Overhead'}`}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-8">
                        {PHASES.map((phase) => {
                            const phaseTasks = filteredTasks.filter(t => t.lnoType === phase.type);
                            // Note: Using type match instead of phase string match to ensure consistency if phase name changes
                            if (phaseTasks.length === 0) return null;

                            return (
                                <div key={phase.type} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="mb-4 border-b border-slate-200 pb-2">
                                        <h3 className="text-xl font-bold text-slate-800">{phase.name}</h3>
                                        <p className="text-sm text-slate-500">{phase.subtext}</p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {phaseTasks.map(task => {
                                            const style = COLORS[task.lnoType || 'L'];
                                            return (
                                                <div
                                                    key={task.id}
                                                    className={`group relative p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md ${task.completed ? 'bg-slate-50 opacity-60' : 'bg-white'} ${style.border}`}
                                                    style={{ borderColor: task.completed ? '#cbd5e1' : undefined }} // Slate-300 if completed
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="pt-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={task.completed}
                                                                onChange={() => toggleTask(task.id)}
                                                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </div>
                                                        <div className="flex-grow">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className={`text-base font-semibold text-slate-800 transition-all ${task.completed ? 'line-through text-slate-400' : ''}`}>
                                                                    {task.title}
                                                                </span>
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ml-2 whitespace-nowrap ${style.badge}`}>
                                                                    {ICONS[task.lnoType || 'L']} {task.lnoType}-Task
                                                                </span>
                                                            </div>
                                                            <p className={`text-sm text-slate-500 ${task.completed ? 'line-through' : ''}`}>
                                                                {task.description}
                                                            </p>
                                                            {task.dueDate && (
                                                                <div className={`flex items-center gap-1 mt-2 text-xs ${new Date(task.dueDate) < new Date() ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                                                                    <Clock size={12} />
                                                                    <span>Due: {new Date(task.dueDate).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openEditModal(task)}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                                title="Edit Task"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => addToCalendar(task)}
                                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                                                                title="Add to Google Calendar"
                                                            >
                                                                <Calendar size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteTask(task.id)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                                                title="Delete Task"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredTasks.length === 0 && (
                            <div className="text-center p-8 text-slate-400">No tasks match this filter.</div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingTask ? 'Edit Task' : 'New Task'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Task Type (LNO)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['L', 'N', 'O'] as const).map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type })}
                                            className={`py-2 px-1 rounded-lg border text-sm font-bold transition-all ${formData.type === type
                                                    ? COLORS[type].badge + ' ring-2 ring-offset-1 ' + (type === 'L' ? 'ring-amber-400' : type === 'N' ? 'ring-blue-400' : 'ring-emerald-400')
                                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                }`}
                                        >
                                            {ICONS[type]} {type === 'L' ? 'Leverage' : type === 'N' ? 'Neutral' : 'Overhead'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Task Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2"
                                    placeholder="What needs to be done?"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description (Optional)</label>
                                <textarea
                                    rows={3}
                                    value={formData.desc}
                                    onChange={e => setFormData({ ...formData, desc: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2"
                                    placeholder="Add details, context, or sub-steps..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Deadline (Optional)</label>
                                <input
                                    type="datetime-local"
                                    value={formData.deadline}
                                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200"
                                >
                                    {editingTask ? 'Save Changes' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <footer className="bg-slate-50 border-t border-slate-200 mt-12 py-8">
                <div className="max-w-5xl mx-auto px-4 text-center text-slate-400 text-sm">
                    <p>Generated for Evening Prioritisation • Focus on what matters.</p>
                </div>
            </footer>
        </div>
    );
};

export default WorkPage;
