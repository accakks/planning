import React, { useState, useEffect, useRef } from 'react';
import { Task, Category } from '@shared/types';
import { X, CheckCircle2, Play, Pause, RotateCcw, ArrowLeft } from 'lucide-react';

interface FocusModeProps {
  task: Task;
  onComplete: () => void;
  onExit: (remainingMinutes: number) => void;
  onUpdateProgress: (remainingMinutes: number) => void;
}

const CATEGORY_COLORS: Record<Category, string> = {
  [Category.CAREER]: 'from-indigo-500 to-blue-500',
  [Category.FINANCE]: 'from-emerald-400 to-green-600',
  [Category.HEALTH]: 'from-rose-400 to-red-500',
  [Category.LIFESTYLE]: 'from-amber-400 to-orange-500',
  [Category.TRAVEL]: 'from-sky-400 to-cyan-500',
  [Category.PERSONAL]: 'from-violet-400 to-purple-600',
};

const FocusMode: React.FC<FocusModeProps> = ({ task, onComplete, onExit, onUpdateProgress }) => {
  // Timer state in seconds internally, but mapped to minutes for the task
  const [timeLeft, setTimeLeft] = useState((task.remainingMinutes ?? task.estimatedMinutes) * 60);
  const [isActive, setIsActive] = useState(false);

  // Audio for timer end (optional, visual only for now)

  useEffect(() => {
    // Fix: Use ReturnType<typeof setInterval> to be compatible with both Node and Browser environments
    let interval: ReturnType<typeof setInterval>;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Auto-start timer on entry
  useEffect(() => {
    setIsActive(true);
  }, []);

  const toggleTimer = () => {
    if (isActive) {
      // If we are pausing, save progress (converting seconds to minutes)
      onUpdateProgress(timeLeft / 60);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    const fullTimeSeconds = task.estimatedMinutes * 60;
    setTimeLeft(fullTimeSeconds);
    onUpdateProgress(task.estimatedMinutes);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = Math.max(0, (timeLeft / (task.estimatedMinutes * 60)) * 100);
  const bgGradient = CATEGORY_COLORS[task.category] || 'from-slate-500 to-slate-700';

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="p-6 flex justify-between items-center">
        <button
          onClick={() => onExit(timeLeft / 60)}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Exit Focus</span>
        </button>
        <div className={`px-3 py-1 rounded-full text-xs font-bold text-white uppercase bg-gradient-to-r ${bgGradient}`}>
          {task.category}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full text-center">

        <div className="mb-12">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Currently Focusing On</h2>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            {task.title}
          </h1>
          {task.description && (
            <p className="mt-4 text-xl text-slate-600 font-light">
              {task.description}
            </p>
          )}
        </div>

        {/* Timer UI */}
        <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mb-12">
          {/* Progress Ring Background */}
          <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth="8"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={`text-slate-900 transition-all duration-1000 ease-linear`}
              strokeDasharray="283%" // Approx 2 * PI * 45
              strokeDashoffset={`${283 - (283 * progress) / 100}%`}
            />
          </svg>

          <div className="flex flex-col items-center z-10">
            <div className="text-7xl md:text-8xl font-mono font-bold text-slate-900 tracking-tighter">
              {formatTime(timeLeft)}
            </div>
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={toggleTimer}
                className="p-4 rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all"
              >
                {isActive ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button
                onClick={resetTimer}
                className="p-4 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
              >
                <RotateCcw size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onComplete}
          className={`w-full max-w-md py-5 rounded-2xl text-white font-bold text-xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 bg-gradient-to-r ${bgGradient}`}
        >
          <CheckCircle2 size={28} />
          Complete Task
        </button>

      </div>
    </div>
  );
};

export default FocusMode;