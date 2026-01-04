
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ChatSession, Message } from './types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('omar_ai_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load sessions from storage:", e);
      return [];
    }
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Robust persistence with quota management
  useEffect(() => {
    const persistSessions = (data: ChatSession[]) => {
      try {
        localStorage.setItem('omar_ai_sessions', JSON.stringify(data));
      } catch (e: any) {
        // Handle QuotaExceededError (and variants across browsers)
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22) {
          console.warn("Storage quota exceeded. Purging oldest session to free space...");
          if (data.length > 1) {
            // Recursively try to save with one less session
            const reducedSessions = data.slice(0, -1);
            // Update state so the UI reflects what's actually stored
            setSessions(reducedSessions);
          } else if (data.length === 1 && data[0].messages.length > 5) {
            // If even 1 session is too big, purge oldest messages in that session
            const modified = [{ ...data[0], messages: data[0].messages.slice(-5) }];
            setSessions(modified);
          } else {
            // Critical failure: storage is completely unusable or something else is wrong
            console.error("Storage is full and cannot be recovered automatically.");
          }
        }
      }
    };

    if (sessions.length > 0) {
      persistSessions(sessions);
    }
  }, [sessions]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const startNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'جلسة جديدة',
      messages: [],
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  }, []);

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [currentSessionId, sessions]);

  const updateSessionMessages = useCallback((sessionId: string, messages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const title = (s.title === 'جلسة جديدة' || s.title === 'New Session' || s.title === '') && messages.length > 0 
          ? messages[0].text.slice(0, 35) + (messages[0].text.length > 35 ? '...' : '')
          : s.title;
        return { ...s, messages, title, updatedAt: Date.now() };
      }
      return s;
    }));
  }, []);

  useEffect(() => {
    if (sessions.length === 0) {
      startNewChat();
    } else if (!currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions.length, currentSessionId, startNewChat]);

  return (
    <div className="flex h-screen w-full bg-[#131314] text-[#e3e3e3] overflow-hidden selection:bg-[#8ab4f8]/30" dir="rtl">
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onNewChat={startNewChat}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {currentSession ? (
          <ChatArea 
            session={currentSession}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onUpdateMessages={(messages) => updateSessionMessages(currentSession.id, messages)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-pulse">
              <h1 className="text-6xl font-black omar-gradient-text mb-6 font-google">OMAR AI</h1>
              <p className="text-[#c4c7c5] text-xl font-bold tracking-widest font-google text-right">جاري تشغيل المحرك الأكاديمي...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
