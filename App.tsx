
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

  // Helper function to prune data until it fits in localStorage
  const saveToStorageResiliently = (data: ChatSession[]) => {
    let currentData = [...data];
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (attempts < MAX_ATTEMPTS) {
      try {
        const serialized = JSON.stringify(currentData);
        localStorage.setItem('omar_ai_sessions', serialized);
        return true; // Success
      } catch (e: any) {
        attempts++;
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22) {
          console.warn(`Storage quota exceeded (Attempt ${attempts}). Cleaning up...`);
          
          if (currentData.length > 1) {
            // Remove the oldest session entirely
            currentData = currentData.slice(0, -1);
          } else if (currentData.length === 1) {
            const session = currentData[0];
            // If we only have one session left and it's still too big, 
            // try stripping attachments from the oldest half of messages
            if (session.messages.some(m => m.attachments && m.attachments.length > 0)) {
              currentData = [{
                ...session,
                messages: session.messages.map((m, idx) => {
                  // Strip attachments from older messages
                  if (idx < session.messages.length - 1) {
                    return { ...m, attachments: [] };
                  }
                  return m;
                })
              }];
            } else if (session.messages.length > 1) {
              // If no attachments but still too big, keep only the last few messages
              currentData = [{
                ...session,
                messages: session.messages.slice(-3)
              }];
            } else {
              // If even one message is too big (massive video), we have to clear it
              currentData = [];
              break;
            }
          } else {
            break;
          }
        } else {
          // Some other error
          console.error("Unexpected storage error:", e);
          break;
        }
      }
    }
    
    // If we exited the loop and still failing, last resort: clear everything
    try {
      localStorage.removeItem('omar_ai_sessions');
    } catch (e) {}
    return false;
  };

  useEffect(() => {
    if (sessions.length > 0) {
      const success = saveToStorageResiliently(sessions);
      if (!success) {
        console.error("Failed to recover storage after multiple attempts.");
      }
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
