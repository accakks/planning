import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import { Calendar, Download, ExternalLink } from 'lucide-react';

interface CalendarButtonProps {
  task: Task;
}

const CalendarButton: React.FC<CalendarButtonProps> = ({ task }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getEventDates = () => {
    const startDate = new Date(task.dueDate);
    
    // Check if the due date string represents a specific time.
    // ISO strings ending in T00:00:00.000Z or just YYYY-MM-DD usually imply full-day or default start.
    // If it has a T but no specific time offset (or assumes midnight), we set a default morning time.
    const hasTime = task.dueDate.includes('T') && 
                    !task.dueDate.endsWith('T00:00:00.000Z') && 
                    !task.dueDate.endsWith('T00:00:00Z');
    
    if (!hasTime) {
       // Default to 9 AM if no time specified
       startDate.setHours(9, 0, 0, 0);
    }
    
    const endDate = new Date(startDate.getTime() + (task.estimatedMinutes * 60000));
    return { startDate, endDate };
  };

  const handleGoogleCalendar = () => {
    const { startDate, endDate } = getEventDates();
    
    // Format dates as YYYYMMDDTHHMMSSZ (UTC) for Google Calendar
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const details = `${task.description || ''}\n\nEstimated time: ${task.estimatedMinutes} mins\nCategory: ${task.category}`;
    
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', task.title);
    url.searchParams.append('details', details);
    url.searchParams.append('dates', `${formatDate(startDate)}/${formatDate(endDate)}`);
    // url.searchParams.append('location', ''); 

    window.open(url.toString(), '_blank');
    setIsOpen(false);
  };

  const handleDownloadICS = () => {
    const { startDate, endDate } = getEventDates();
    const now = new Date();
    
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//2026 Kickoff//Tasks//EN
BEGIN:VEVENT
UID:${task.id}@2026kickoff.app
DTSTAMP:${formatDate(now)}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${task.title}
DESCRIPTION:${task.description || ''} - Estimated time: ${task.estimatedMinutes} mins
STATUS:CONFIRMED
CATEGORIES:${task.category}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${task.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-indigo-100 text-indigo-700' : 'text-indigo-600 hover:bg-indigo-50'}`}
        title="Add to Calendar"
      >
        <Calendar size={18} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
           <div className="py-1">
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 handleGoogleCalendar();
               }}
               className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700 font-medium transition-colors"
             >
               <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <ExternalLink size={14} />
               </div>
               Google Calendar
             </button>
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 handleDownloadICS();
               }}
               className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700 font-medium transition-colors border-t border-slate-100"
             >
                <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <Download size={14} />
                </div>
               Outlook / iCal
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CalendarButton;