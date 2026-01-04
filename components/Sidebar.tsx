
import React from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  isOpen,
  onToggle
}) => {
  return (
    <>
      {/* Overlay - smooth fade */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-30 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onToggle}
      />
      
      {/* Sidebar - improved hiding logic with overflow-hidden and visibility */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 bg-[#1e1f20] h-full transition-all duration-500 ease-in-out flex flex-col z-40 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-r border-[#3c4043] overflow-hidden ${
          isOpen ? 'translate-x-0 w-[320px] opacity-100 visible' : '-translate-x-full w-0 opacity-0 invisible'
        }`}
      >
        <div className="flex flex-col h-full py-8 px-5 min-w-[320px]" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black omar-gradient-text tracking-tighter font-google">سجل المحادثات</h2>
              <span className="text-[10px] text-[#c4c7c5] font-bold uppercase tracking-widest opacity-60">لوحة التحكم الأكاديمية</span>
            </div>
            <button 
              onClick={onToggle}
              className="p-3 hover:bg-[#3c4043] rounded-full text-[#c4c7c5] transition-all hover:scale-110"
              aria-label="إغلاق القائمة"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* New Chat Primary Action */}
          <button 
            onClick={() => { onNewChat(); onToggle(); }}
            className="group flex items-center justify-center gap-3 bg-gradient-to-r from-[#4285f4] to-[#9b72cb] hover:brightness-110 text-white rounded-2xl px-4 py-4 transition-all mb-10 font-black shadow-xl hover:scale-[1.02] active:scale-95"
          >
            <div className="bg-white/20 p-1.5 rounded-xl">
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <span className="text-lg">جلسة جديدة</span>
          </button>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-6 px-2">
               <h3 className="text-xs font-black text-[#c4c7c5] uppercase tracking-[0.2em]">النشاطات الأخيرة</h3>
               <span className="text-[10px] bg-[#3c4043] px-2 py-0.5 rounded-full text-[#e3e3e3]">{sessions.length} محادثات</span>
            </div>
            
            <div className="space-y-3">
              {sessions.map(session => (
                <div 
                  key={session.id}
                  className={`group flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer transition-all border ${
                    currentSessionId === session.id 
                      ? 'bg-[#3c4043] border-[#8ab4f8] shadow-lg shadow-[#8ab4f8]/5' 
                      : 'hover:bg-[#2e2f31] border-transparent'
                  }`}
                  onClick={() => { onSelectSession(session.id); onToggle(); }}
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${currentSessionId === session.id ? 'bg-[#8ab4f8] text-[#131314]' : 'bg-[#131314] text-[#8ab4f8]'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold truncate block text-[#e3e3e3] text-right">{session.title || "محادثة بدون عنوان"}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-[#3c4043] pt-8 flex flex-col items-center gap-2">
             <div className="text-[10px] text-[#c4c7c5] opacity-40 font-bold uppercase tracking-widest font-google">OMAR AI PRO v4.5</div>
          </div>
        </div>
      </aside>
    </>
  );
};
