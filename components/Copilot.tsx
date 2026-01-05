import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Check, ArrowRight, Loader2, PlusCircle, MessageSquare, BookOpen, History, Plus, Trash2, ChevronLeft, MoreVertical } from 'lucide-react';
import { UserProfile, Theme, Task, ChatMessage, Category, Story, ChatSession } from '../types';
import { chatWithCopilot } from '../services/gemini';
import { getChatSessions, saveChatSession, deleteChatSession, createNewSession, generateSessionTitle } from '../services/chatHistory';

interface CopilotProps {
  user: UserProfile;
  currentTheme: Theme;
  tasks: Task[];
  stories: Story[];
  onAddTasks: (tasks: Partial<Task>[]) => void;
  onAddTheme: (theme: Partial<Theme>) => void;
  onAddStory: (story: Partial<Story>) => void;
}

const Copilot: React.FC<CopilotProps> = ({ user, currentTheme, tasks, stories, onAddTasks, onAddTheme, onAddStory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Sessions on Mount
  useEffect(() => {
    if (!user.email) return;
    const loadedSessions = getChatSessions(user.email);
    setSessions(loadedSessions);

    if (loadedSessions.length > 0) {
      setCurrentSessionId(loadedSessions[0].id);
    } else {
      const newSession = createNewSession(user.name, currentTheme.title);
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
      saveChatSession(user.email, newSession);
    }
  }, [user.email]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, showHistory]);

  const handleNewChat = () => {
    const newSession = createNewSession(user.name, currentTheme.title);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    saveChatSession(user.email, newSession);
    setShowHistory(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat history?")) return;

    deleteChatSession(user.email, id);
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);

    if (currentSessionId === id) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
      } else {
        const newS = createNewSession(user.name, currentTheme.title);
        setSessions([newS]);
        setCurrentSessionId(newS.id);
        saveChatSession(user.email, newS);
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !currentSessionId) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMsg];

    // Update Local State with potential title change
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        let title = s.title;
        // If it was a "New Chat" and this is the first real exchange
        if (s.title === 'New Chat' || (s.messages.length === 1 && s.messages[0].id === 'init')) {
          title = generateSessionTitle(inputText);
        }
        return { ...s, messages: updatedMessages, title, updatedAt: new Date().toISOString() };
      }
      return s;
    }));

    setInputText('');
    setIsThinking(true);

    try {
      const history = updatedMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const responseText = await chatWithCopilot(history, userMsg.text, user, currentTheme, tasks, stories);

      if (responseText) {
        const taskMatch = responseText.match(/<JSON_ACTION type="TASKS">([\s\S]*?)<\/JSON_ACTION>/);
        const themeMatch = responseText.match(/<JSON_ACTION type="THEME">([\s\S]*?)<\/JSON_ACTION>/);
        const storyMatch = responseText.match(/<JSON_ACTION type="STORY">([\s\S]*?)<\/JSON_ACTION>/);

        const cleanText = responseText
          .replace(/<JSON_ACTION type="TASKS">[\s\S]*?<\/JSON_ACTION>/g, '')
          .replace(/<JSON_ACTION type="THEME">[\s\S]*?<\/JSON_ACTION>/g, '')
          .replace(/<JSON_ACTION type="STORY">[\s\S]*?<\/JSON_ACTION>/g, '')
          .trim();

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          text: cleanText,
          sender: 'ai',
          timestamp: new Date()
        };

        if (taskMatch?.[1]) {
          try { aiMsg.suggestedTasks = JSON.parse(taskMatch[1]); } catch (e) { }
        }
        if (themeMatch?.[1]) {
          try { aiMsg.suggestedTheme = JSON.parse(themeMatch[1]); } catch (e) { }
        }
        if (storyMatch?.[1]) {
          try { aiMsg.suggestedStory = JSON.parse(storyMatch[1]); } catch (e) { }
        }

        setSessions(prev => {
          const finalSessions = prev.map(s => {
            if (s.id === currentSessionId) {
              const newMsgs = [...updatedMessages, aiMsg];
              const updatedS = { ...s, messages: newMsgs, updatedAt: new Date().toISOString() };
              saveChatSession(user.email, updatedS);
              return updatedS;
            }
            return s;
          });
          return finalSessions;
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  const handleApplyTasks = (msgId: string, suggestedTasks: Partial<Task>[]) => {
    onAddTasks(suggestedTasks);
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMsgs = s.messages.map(m => {
            if (m.id === msgId) {
              const appliedIds = [...(m.appliedTaskIds || [])];
              suggestedTasks.forEach((_, idx) => {
                if (!appliedIds.includes(idx.toString()) && !(m.rejectedTaskIds || []).includes(idx.toString())) {
                  appliedIds.push(idx.toString());
                }
              });
              return { ...m, appliedTaskIds: appliedIds };
            }
            return m;
          });
          const updatedS = { ...s, messages: updatedMsgs };
          saveChatSession(user.email, updatedS);
          return updatedS;
        }
        return s;
      });
      return updated;
    });
  };

  const handleApplySingleTask = (msgId: string, task: Partial<Task>, index: number) => {
    onAddTasks([task]);
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMsgs = s.messages.map(m =>
            m.id === msgId ? { ...m, appliedTaskIds: [...(m.appliedTaskIds || []), index.toString()] } : m
          );
          const updatedS = { ...s, messages: updatedMsgs };
          saveChatSession(user.email, updatedS);
          return updatedS;
        }
        return s;
      });
      return updated;
    });
  };

  const handleRejectTask = (msgId: string, index: number) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMsgs = s.messages.map(m =>
            m.id === msgId ? { ...m, rejectedTaskIds: [...(m.rejectedTaskIds || []), index.toString()] } : m
          );
          const updatedS = { ...s, messages: updatedMsgs };
          saveChatSession(user.email, updatedS);
          return updatedS;
        }
        return s;
      });
      return updated;
    });
  };

  const handleApplyTheme = (msgId: string, theme: Partial<Theme>) => {
    onAddTheme(theme);
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMsgs = s.messages.map(m =>
            m.id === msgId ? { ...m, themeApplied: true } : m
          );
          const updatedS = { ...s, messages: updatedMsgs };
          saveChatSession(user.email, updatedS);
          return updatedS;
        }
        return s;
      });
      return updated;
    });
  };

  const handleRejectTheme = (msgId: string) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMsgs = s.messages.map(m =>
            m.id === msgId ? { ...m, themeRejected: true } : m
          );
          const updatedS = { ...s, messages: updatedMsgs };
          saveChatSession(user.email, updatedS);
          return updatedS;
        }
        return s;
      });
      return updated;
    });
  };

  const handleApplyStory = (msgId: string, story: Partial<Story>) => {
    onAddStory(story);
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMsgs = s.messages.map(m =>
            m.id === msgId ? { ...m, storyApplied: true } : m
          );
          const updatedS = { ...s, messages: updatedMsgs };
          saveChatSession(user.email, updatedS);
          return updatedS;
        }
        return s;
      });
      return updated;
    });
  };

  const handleRejectStory = (msgId: string) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMsgs = s.messages.map(m =>
            m.id === msgId ? { ...m, storyRejected: true } : m
          );
          const updatedS = { ...s, messages: updatedMsgs };
          saveChatSession(user.email, updatedS);
          return updatedS;
        }
        return s;
      });
      return updated;
    });
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
          fixed bottom-24 right-6 w-full z-40
          bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50
          flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
          ${isMaximized ? 'max-w-[800px] h-[85vh]' : 'max-w-[380px] h-[600px] max-h-[80vh]'}
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-white/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              title="Chat History"
            >
              <History size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center text-white shadow-md">
              <Bot size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-xs truncate">
                {showHistory ? 'Chat History' : (currentSession?.title || 'Copilot')}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <ChevronLeft size={18} className="rotate-90" /> : <PlusCircle size={18} className="rotate-45" />}
            </button>
            <button
              onClick={handleNewChat}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              title="New Chat"
            >
              <Plus size={18} />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          {/* History Panel */}
          <div
            className={`
              absolute inset-0 z-20 bg-white transition-transform duration-300
              ${showHistory ? 'translate-x-0' : '-translate-x-full'}
            `}
          >
            <div className="p-4 space-y-2 overflow-y-auto h-full">
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    setShowHistory(false);
                  }}
                  className={`
                    group p-3 rounded-xl border transition-all cursor-pointer relative
                    ${currentSessionId === s.id
                      ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-200'
                      : 'bg-slate-50 border-slate-100 hover:border-slate-200'}
                  `}
                >
                  <div className="pr-8">
                    <h4 className={`text-xs font-bold truncate ${currentSessionId === s.id ? 'text-rose-700' : 'text-slate-700'}`}>
                      {s.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center py-10">
                  <MessageSquare className="mx-auto text-slate-200 mb-2" size={32} />
                  <p className="text-xs text-slate-400">No chat history yet</p>
                </div>
              )}
            </div>
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
                  {msg.suggestedTasks && (msg.appliedTaskIds?.length || 0) < msg.suggestedTasks.length && !msg.rejectedTaskIds?.includes('all') && (
                    <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Sparkles size={12} className="text-rose-500" /> Suggested Tasks
                        </p>
                        <button
                          onClick={() => handleApplyTasks(msg.id, msg.suggestedTasks!.filter((_, i) => !msg.appliedTaskIds?.includes(i.toString()) && !msg.rejectedTaskIds?.includes(i.toString())))}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1 bg-rose-50 rounded-lg transition-colors"
                        >
                          Add All
                        </button>
                      </div>
                      <div className="space-y-2 mb-3">
                        {msg.suggestedTasks.map((t, i) => {
                          const isApplied = msg.appliedTaskIds?.includes(i.toString());
                          const isRejected = msg.rejectedTaskIds?.includes(i.toString());
                          if (isRejected) return null;

                          return (
                            <div key={i} className={`flex items-start justify-between gap-2 p-2 rounded-lg border bg-white ${isApplied ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100'}`}>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-semibold truncate ${isApplied ? 'text-emerald-700' : 'text-slate-700'}`}>
                                  {isApplied && <Check size={10} className="inline mr-1" />}
                                  {t.title}
                                </p>
                                {t.subtasks && t.subtasks.length > 0 && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 ml-2">
                                    {t.subtasks.length} subtasks
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {!isApplied && (
                                  <>
                                    <button
                                      onClick={() => handleApplySingleTask(msg.id, t, i)}
                                      className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                                      title="Add Task"
                                    >
                                      <PlusCircle size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleRejectTask(msg.id, i)}
                                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                      title="Reject"
                                    >
                                      <X size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Added everything feedback */}
                  {msg.suggestedTasks && msg.appliedTaskIds?.length === msg.suggestedTasks.length && (
                    <div className="mt-3 bg-emerald-50 rounded-xl p-2 border border-emerald-100 flex items-center justify-center gap-2 text-emerald-700 text-xs font-bold">
                      <Check size={14} /> All tasks added to board
                    </div>
                  )}

                  {/* Agentic Actions - Theme */}
                  {msg.suggestedTheme && !msg.themeApplied && !msg.themeRejected && (
                    <div className="mt-3 bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl p-3 border border-rose-100">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-rose-600 uppercase">New Era Proposal</p>
                        <button onClick={() => handleRejectTheme(msg.id)} className="text-slate-400 hover:text-rose-500">
                          <X size={14} />
                        </button>
                      </div>
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
                  {msg.themeApplied && (
                    <div className="mt-3 bg-rose-50 rounded-xl p-2 border border-rose-100 flex items-center justify-center gap-2 text-rose-700 text-xs font-bold">
                      <Check size={14} /> New Era created!
                    </div>
                  )}

                  {/* Agentic Actions - Story */}
                  {msg.suggestedStory && !msg.storyApplied && !msg.storyRejected && (
                    <div className="mt-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1">
                          <BookOpen size={12} className="text-blue-500" /> New Story
                        </p>
                        <button onClick={() => handleRejectStory(msg.id)} className="text-slate-400 hover:text-blue-500">
                          <X size={14} />
                        </button>
                      </div>
                      <h4 className="font-display font-bold text-slate-800">{msg.suggestedStory.title}</h4>
                      {msg.suggestedStory.description && (
                        <p className="text-xs text-slate-600 mb-3 line-clamp-2">{msg.suggestedStory.description}</p>
                      )}
                      <button
                        onClick={() => handleApplyStory(msg.id, msg.suggestedStory!)}
                        className="w-full py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <PlusCircle size={14} /> Create Story
                      </button>
                    </div>
                  )}
                  {msg.storyApplied && (
                    <div className="mt-3 bg-blue-50 rounded-xl p-2 border border-blue-100 flex items-center justify-center gap-2 text-blue-700 text-xs font-bold">
                      <Check size={14} /> Story created!
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