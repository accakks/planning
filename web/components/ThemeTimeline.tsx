import React from 'react';
import { Theme } from '@shared/types';
import { Plus, CalendarDays } from 'lucide-react';

interface ThemeTimelineProps {
  themes: Theme[];
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
  onAddTheme: () => void;
}

const ThemeTimeline: React.FC<ThemeTimelineProps> = ({ themes, currentThemeId, onSelectTheme, onAddTheme }) => {
  // Sort themes by start date
  const sortedThemes = [...themes].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar">
      <div className="flex gap-4 items-center min-w-max px-1">
        {sortedThemes.map((theme) => {
          const isActive = theme.id === currentThemeId;
          const startDate = new Date(theme.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          const endDate = new Date(theme.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          
          return (
            <button
              key={theme.id}
              onClick={() => onSelectTheme(theme.id)}
              className={`
                relative flex flex-col items-start p-4 rounded-2xl transition-all duration-300 border
                ${isActive 
                  ? `bg-white shadow-lg scale-105 border-transparent ring-2 ring-offset-2 ring-slate-400` 
                  : 'bg-white/40 hover:bg-white/60 border-white/20 hover:scale-[1.02]'}
                min-w-[180px] h-[100px] justify-between
              `}
            >
              {/* Background gradient hint */}
              <div className={`absolute inset-0 rounded-2xl opacity-10 bg-gradient-to-br ${theme.style.gradientFrom} ${theme.style.gradientTo}`}></div>
              
              <div className="z-10 w-full text-left">
                <span className={`text-xs font-bold uppercase tracking-wider opacity-70 ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                   {startDate} - {endDate}
                </span>
                <h3 className={`font-display font-bold text-lg leading-tight mt-1 truncate ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                  {theme.title}
                </h3>
              </div>
              
              <div className="z-10 w-full flex justify-between items-end">
                <span className="text-[10px] text-slate-500 line-clamp-1">{theme.description}</span>
                {isActive && <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${theme.style.gradientFrom} ${theme.style.gradientTo}`}></div>}
              </div>
            </button>
          );
        })}

        <button
          onClick={onAddTheme}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-300/50 hover:border-white hover:bg-white/20 text-slate-500 hover:text-white transition-all min-w-[100px] h-[100px] group"
        >
          <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Plus size={20} />
          </div>
          <span className="text-xs font-bold uppercase">New Era</span>
        </button>
      </div>
    </div>
  );
};

export default ThemeTimeline;