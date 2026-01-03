import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Check, ArrowRight, Loader2, PlusCircle, MessageSquare } from 'lucide-react';
import { UserProfile, Theme, Task, ChatMessage, Category } from '../types';
import { chatWithCopilot } from '../services/gemini';

interface CopilotProps {
  user: UserProfile;
  currentTheme: Theme;
  tasks: Task[];
  onAddTasks: (tasks: Partial<Task>[]) => void;
  onAddTheme: (theme: Partial<Theme>) => void;
}

const Copilot: React.FC<CopilotProps> = ({ user, currentTheme, tasks, onAddTasks, onAddTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial Greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'init',
          text: `Hey ${user.name}! I'm ready to help you plan the "${currentTheme.title}" era. Need ideas or tasks?`,
          sender: 'ai',
          timestamp: new Date()
        }
      ]);
    }
  }, [user.name, currentTheme.title]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const responseText = await chatWithCopilot(history, userMsg.text, user, currentTheme, tasks);

      if (responseText) {
        // Parse "Agentic" Actions hidden in the text
        const taskMatch = responseText.match(/<JSON_ACTION type="TASKS">([\s\S]*?)<\/JSON_ACTION>/);
        const themeMatch = responseText.match(/<JSON_ACTION type="THEME">([\s\S]*?)<\/JSON_ACTION>/);

        let cleanText = responseText
          .replace(/<JSON_ACTION type="TASKS">[\s\S]*?<\/JSON_ACTION>/g, '')
          .replace(/<JSON_ACTION type="THEME">[\s\S]*?<\/JSON_ACTION>/g, '')
          .trim();

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          text: cleanText,
          sender: 'ai',
          timestamp: new Date()
        };

        if (taskMatch && taskMatch[1]) {
          try {
             aiMsg.suggestedTasks = JSON.parse(taskMatch[1]);
          } catch (e) { console.error("Failed to parse tasks", e); }
        }

        if (themeMatch && themeMatch[1]) {
          try {
             aiMsg.suggestedTheme = JSON.parse(themeMatch[1]);
          } catch (e) { console.error("Failed to parse theme", e); }
        }

        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        text: "My connection got a bit fuzzy. Mind repeating that?",
        sender: 'ai',
        timestamp: new Date()
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleApplyTasks = (msgId: string, suggestedTasks: Partial<Task>[]) => {
    onAddTasks(suggestedTasks);
    // Mark as processed nicely in UI (optional, for now just a visual confirm)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: m.text + "\n\n✅ Added to your board!" } : m));
  };

  const handleApplyTheme = (msgId: string, theme: Partial<Theme>) => {
    onAddTheme(theme);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: m.text + "\n\n✅ New Era created!" } : m));
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 ${isOpen ? 'rotate-90 bg-slate-200 text-slate-800' : 'bg-slate-900 text-white animate-bounce-slow'}`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Chat Window */}
      <div 
        className={`
          fixed bottom-24 right-6 w-full max-w-[380px] h-[600px] max-h-[80vh] z-40
          bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50
          flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-white/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center text-white shadow-md">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Planner Copilot</h3>
              <p className="text-[10px] text-slate-500 font-medium">Powered by Gemini 3.0</p>
            </div>
          </div>
          <button onClick={() => setMessages([])} className="text-xs text-slate-400 hover:text-rose-500">
             Clear
          </button>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`
                  max-w-[85%] rounded-2xl p-3 text-sm shadow-sm
                  ${msg.sender === 'user' 
                    ? 'bg-slate-900 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}
                `}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Agentic Actions - Tasks */}
                {msg.suggestedTasks && !msg.text.includes("✅ Added") && (
                  <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase flex items-center gap-1">
                      <Sparkles size={12} className="text-rose-500"/> Suggested Tasks
                    </p>
                    <ul className="space-y-1 mb-3">
                      {msg.suggestedTasks.slice(0, 3).map((t, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          {t.title}
                        </li>
                      ))}
                      {msg.suggestedTasks.length > 3 && <li className="text-xs text-slate-400 pl-3.5">+{msg.suggestedTasks.length - 3} more...</li>}
                    </ul>
                    <button 
                      onClick={() => handleApplyTasks(msg.id, msg.suggestedTasks!)}
                      className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <PlusCircle size={14} /> Add {msg.suggestedTasks.length} Tasks
                    </button>
                  </div>
                )}

                {/* Agentic Actions - Theme */}
                {msg.suggestedTheme && !msg.text.includes("✅ New Era") && (
                  <div className="mt-3 bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl p-3 border border-rose-100">
                    <p className="text-xs font-bold text-rose-600 mb-2 uppercase">New Era Proposal</p>
                    <h4 className="font-display font-bold text-slate-800">{msg.suggestedTheme.title}</h4>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2">{msg.suggestedTheme.description}</p>
                     <button 
                      onClick={() => handleApplyTheme(msg.id, msg.suggestedTheme!)}
                      className="w-full py-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <PlusCircle size={14} /> Create Era
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-100">
                 <div className="flex gap-1">
                   <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                   <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me to plan something..."
              className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-100 border-none focus:ring-2 focus:ring-rose-200 outline-none text-sm placeholder-slate-400"
            />
            <button 
              type="submit" 
              disabled={!inputText.trim() || isThinking}
              className="absolute right-2 p-2 bg-white rounded-lg text-rose-500 shadow-sm hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default Copilot;