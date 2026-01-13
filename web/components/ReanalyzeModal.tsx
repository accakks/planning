import React, { useState, useEffect } from 'react';
import { Task, Category } from '@shared/types';
import { X, Sparkles, Check, AlertTriangle, Clock, Calendar, Loader2, RotateCcw } from 'lucide-react';
import { reanalyzeTasks } from '@shared/services/gemini';

interface Concern {
    taskId: string;
    concern: string;
    suggestedMinutes?: number;
    suggestedDueDate?: string;
}

interface ReanalyzeModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTasks: Task[];
    onApprove: (taskId: string, suggestion: Partial<Task>) => void;
}

const ReanalyzeModal: React.FC<ReanalyzeModalProps> = ({ isOpen, onClose, selectedTasks, onApprove }) => {
    const [loading, setLoading] = useState(false);
    const [concerns, setConcerns] = useState<Concern[]>([]);
    const [approvedIds, setApprovedIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && selectedTasks.length > 0) {
            handleReanalyze();
        }
    }, [isOpen]);

    const handleReanalyze = async () => {
        setLoading(true);
        setConcerns([]);
        setApprovedIds([]);
        try {
            const results = await reanalyzeTasks(selectedTasks);
            setConcerns(results);
        } catch (error) {
            console.error("Failed to reanalyze", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleApprove = (concern: Concern) => {
        const suggestion: Partial<Task> = {};
        if (concern.suggestedMinutes) suggestion.estimatedMinutes = concern.suggestedMinutes;
        if (concern.suggestedDueDate) suggestion.dueDate = concern.suggestedDueDate;

        onApprove(concern.taskId, suggestion);
        setApprovedIds(prev => [...prev, concern.taskId]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">AI Workflow Check</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reanalyzing {selectedTasks.length} Estimates</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="relative">
                                <Loader2 size={48} className="text-indigo-600 animate-spin" />
                                <Sparkles size={20} className="text-amber-400 absolute -top-2 -right-2 animate-pulse" />
                            </div>
                            <p className="mt-4 text-slate-600 font-bold">Scanning your plan with AI...</p>
                            <p className="text-sm text-slate-400">Reviewing time estimates and deadlines</p>
                        </div>
                    ) : concerns.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="bg-green-100 p-4 rounded-full mb-4">
                                <Check size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Your plan looks solid!</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">No major concerns found with your focus times or deadlines.</p>
                            <button
                                onClick={onClose}
                                className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                            >
                                Awesome
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                                <AlertTriangle size={20} className="text-amber-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-800">AI found {concerns.length} potential issues</p>
                                    <p className="text-xs text-amber-700/70">Review the suggestions below to optimize your focus time.</p>
                                </div>
                            </div>

                            {concerns.map((concern, idx) => {
                                const task = selectedTasks.find(t => t.id === concern.taskId);
                                const isApproved = approvedIds.includes(concern.taskId);

                                if (!task) return null;

                                return (
                                    <div key={idx} className={`group border rounded-2xl p-5 transition-all duration-300 ${isApproved ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-slate-800 mb-2 ${isApproved ? 'line-through opacity-50' : ''}`}>{task.title}</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    {concern.concern}
                                                </p>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {concern.suggestedMinutes && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                                                            <Clock size={12} />
                                                            {task.estimatedMinutes}m → {concern.suggestedMinutes}m
                                                        </div>
                                                    )}
                                                    {concern.suggestedDueDate && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-100">
                                                            <Calendar size={12} />
                                                            Schedule Update
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {isApproved ? (
                                                <div className="flex items-center gap-1 text-green-600 font-bold text-sm bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                                                    <Check size={16} /> Applied
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => handleApprove(concern)}
                                                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-500 active:scale-95 transition-all whitespace-nowrap"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setConcerns(prev => prev.filter(c => c.taskId !== concern.taskId))}
                                                        className="text-slate-400 hover:text-slate-600 text-xs font-bold py-1 hover:bg-slate-50 rounded-lg transition-all"
                                                    >
                                                        Ignore
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <button
                        onClick={handleReanalyze}
                        disabled={loading}
                        className="text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <RotateCcw size={16} /> Re-scan All
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReanalyzeModal;
