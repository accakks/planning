import React, { useState } from 'react';
import { Task, Category, ThemeStyle, Story } from '../types';
import { CheckCircle2, Circle, AlertCircle, Clock, BookOpen, Target, Trash2, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import CalendarButton from './CalendarButton';

interface TaskCardProps {
    task: Task;
    stories: Story[];
    viewMode: 'list' | 'story';
    themeStyle: ThemeStyle;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
    onFocus: (task: Task) => void;
    onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

const CATEGORY_COLORS: Record<Category, string> = {
    [Category.CAREER]: '#6366f1',
    [Category.FINANCE]: '#10b981',
    [Category.HEALTH]: '#f43f5e',
    [Category.LIFESTYLE]: '#f59e0b',
    [Category.TRAVEL]: '#0ea5e9',
    [Category.PERSONAL]: '#8b5cf6',
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

const TaskCard: React.FC<TaskCardProps> = ({
    task,
    stories,
    viewMode,
    themeStyle,
    onToggle,
    onDelete,
    onEdit,
    onFocus,
    onToggleSubtask,
}) => {
    const status = getTaskStatus(task);
    const parentStory = stories.find(s => s.id === task.storyId);
    const [isExpanded, setIsExpanded] = useState(false);

    const completedSubtasks = (task.subtasks || []).filter(st => st.completed).length;
    const totalSubtasks = (task.subtasks || []).length;
    const progress = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

    return (
        <div
            className={`group bg-white p-4 rounded-2xl border transition-all duration-200 hover:shadow-md 
        ${task.completed ? 'border-slate-100 opacity-60' : 'border-slate-200'}
        ${status === 'overdue' && !task.completed ? 'border-l-4 border-l-rose-500' : ''}
        ${status === 'soon' && !task.completed ? 'border-l-4 border-l-amber-400' : ''}
      `}
        >
            <div className="flex items-start gap-4">
                <button onClick={() => onToggle(task.id)} className={`flex-shrink-0 mt-1 ${task.completed ? 'text-green-500' : `text-slate-300 hover:${themeStyle.accentColor}`}`}>
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
                                <div key={st.id} className="flex items-center gap-2 min-h-[28px]">
                                    <button
                                        onClick={() => onToggleSubtask(task.id, st.id)}
                                        className={`flex-shrink-0 text-slate-300 hover:text-slate-500 ${st.completed ? 'text-green-500' : ''}`}
                                    >
                                        {st.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                    </button>
                                    <span className={`flex-1 text-sm truncate ${st.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                        {st.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Mobile Actions */}
                    <div className="flex sm:hidden items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                        {!task.completed && (
                            <button
                                onClick={() => onFocus(task)}
                                className={`flex items-center gap-1 text-xs font-bold ${themeStyle.accentColor}`}
                            >
                                <Target size={16} /> Focus
                            </button>
                        )}
                        <div className="scale-90 origin-left">
                            <CalendarButton task={task} />
                        </div>
                        <button
                            onClick={() => onEdit(task)}
                            className="flex items-center gap-1 text-xs font-bold text-slate-400"
                        >
                            <Pencil size={16} /> Edit
                        </button>
                        <button
                            onClick={() => onDelete(task.id)}
                            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-500"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!task.completed && (
                        <button
                            onClick={() => onFocus(task)}
                            className={`p-2 hover:bg-slate-50 rounded-full transition-colors ${themeStyle.accentColor}`}
                            title="Focus Mode"
                        >
                            <Target size={18} />
                        </button>
                    )}
                    <CalendarButton task={task} />
                    <button
                        onClick={() => onEdit(task)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <Pencil size={18} />
                    </button>
                    <button onClick={() => onDelete(task.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskCard;
