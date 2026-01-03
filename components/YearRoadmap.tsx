import React from 'react';
import { Theme, Story, Task } from '../types';
import { Plus, X, Calendar, ArrowRight, Sparkles, Map, Trash2, Edit2, CheckSquare, Square, BookOpen } from 'lucide-react';

interface YearRoadmapProps {
  themes: Theme[];
  stories: Story[];
  tasks: Task[];
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
  onAddTheme: () => void;
  onEditTheme: (theme: Theme) => void;
  onDeleteTheme: (themeId: string) => void;
  onToggleComplete: (themeId: string) => void;
  onClose: () => void;
}

const YearRoadmap: React.FC<YearRoadmapProps> = ({ 
  themes, 
  stories,
  tasks,
  currentThemeId, 
  onSelectTheme, 
  onAddTheme, 
  onEditTheme,
  onDeleteTheme,
  onToggleComplete,
  onClose 
}) => {
  // Sort themes by start date
  const sortedThemes = [...themes].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-xl overflow-y-auto animate-in fade-in slide-in-from-bottom-10 duration-300">
      <div className="max-w-3xl mx-auto px-6 py-12 min-h-screen flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-16 sticky top-0 bg-slate-50/80 backdrop-blur-md py-4 z-10 -mx-6 px-6 border-b border-slate-200/50">
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900">2026 Journey</h2>
            <p className="text-slate-500">Your eras, your energy, your year.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white rounded-full hover:bg-slate-100 transition-colors shadow-sm border border-slate-200 text-slate-500 hover:text-slate-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* Timeline */}
        <div className="relative flex-1 pl-4 md:pl-8">
          {/* Vertical Line */}
          <div className="absolute left-4 md:left-8 top-4 bottom-20 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-transparent"></div>

          <div className="space-y-12">
            {sortedThemes.map((theme, index) => {
              const isActive = theme.id === currentThemeId;
              const startDate = new Date(theme.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const endDate = new Date(theme.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const isPast = new Date(theme.endDate) < new Date();
              const isCompleted = theme.completed;

              // Calculate top stories
              const themeStories = stories.filter(s => s.themeId === theme.id);
              const topStories = themeStories.map(s => ({
                  ...s,
                  count: tasks.filter(t => t.storyId === s.id).length
              }))
              .filter(s => s.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);

              return (
                <div key={theme.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className={`
                    absolute left-[-5px] md:left-[-5px] top-6 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 transition-all duration-300
                    ${isCompleted ? 'bg-green-500 ring-2 ring-green-200' : isActive ? `bg-slate-900 scale-150` : isPast ? 'bg-slate-400' : 'bg-slate-200'}
                  `}></div>

                  {/* Card */}
                  <div
                    className={`
                      relative w-full ml-6 md:ml-10 p-6 rounded-3xl border transition-all duration-300 
                      ${isActive 
                        ? `bg-white shadow-xl ring-2 ring-slate-900 ring-offset-2 ${theme.style.cardBorder}` 
                        : isCompleted 
                          ? 'bg-slate-50 border-slate-200 opacity-90'
                          : 'bg-white hover:shadow-lg border-slate-200 hover:border-slate-300'}
                    `}
                  >
                    {/* Main Click Area for Selection */}
                    <div 
                      onClick={() => {
                        onSelectTheme(theme.id);
                        onClose();
                      }}
                      className="cursor-pointer flex flex-col md:flex-row md:items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <span className={`text-xs font-bold uppercase tracking-wider py-1 px-2 rounded-md ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                             {startDate} — {endDate}
                           </span>
                           {isActive && <span className="flex items-center gap-1 text-xs font-bold text-rose-500 animate-pulse"><Sparkles size={10} /> Active Era</span>}
                           {isCompleted && <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">Completed</span>}
                        </div>
                        <h3 className={`text-2xl font-display font-bold mb-1 ${isCompleted ? 'text-slate-500 line-through' : theme.style.accentColor.replace('text-', 'text-')}`}>
                          {theme.title}
                        </h3>
                        <p className="text-slate-600 text-sm line-clamp-2 md:line-clamp-none mb-3">
                          {theme.description}
                        </p>
                        
                        {/* Highlights (Top Stories) */}
                        {topStories.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {topStories.map(story => (
                              <span key={story.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                <BookOpen size={10} className="text-slate-400" />
                                {story.title}
                                <span className="ml-0.5 text-slate-400">({story.count})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Visual Preview of Theme */}
                      <div className={`
                        h-24 w-full md:w-32 rounded-2xl flex-shrink-0 bg-gradient-to-br ${theme.style.gradientFrom} ${theme.style.gradientTo}
                        opacity-80 transition-opacity shadow-inner flex items-center justify-center
                      `}>
                         {isActive ? <div className="bg-white/20 backdrop-blur rounded-full p-2"><Sparkles className="text-white" size={20}/></div> : null}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(theme.id);
                        }}
                        className={`p-2 rounded-full transition-colors ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        title={isCompleted ? "Mark Incomplete" : "Mark Complete"}
                      >
                        {isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      {/* Edit Button - Disabled if Completed */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCompleted) onEditTheme(theme);
                        }}
                        disabled={isCompleted || false}
                        className={`p-2 rounded-full transition-colors ${
                          isCompleted 
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={isCompleted ? "Cannot edit completed era" : "Edit Era"}
                      >
                        <Edit2 size={18} />
                      </button>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to delete this era? All associated tasks will be removed.")) {
                            onDeleteTheme(theme.id);
                          }
                        }}
                        className="p-2 rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                        title="Delete Era"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add New Button (End of Timeline) */}
            <div className="relative">
               <div className="absolute left-[-5px] md:left-[-5px] top-6 w-3 h-3 rounded-full bg-slate-200 border-2 border-white z-10"></div>
               <button
                onClick={onAddTheme}
                className="w-full ml-6 md:ml-10 p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-600 flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center shadow-sm transition-transform group-hover:scale-110">
                  <Plus size={24} />
                </div>
                <span className="font-bold">Plan Next Era</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearRoadmap;