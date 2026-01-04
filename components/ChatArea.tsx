
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, Message, Attachment } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { gemini } from '../services/gemini';
import { PromptBar } from './PromptBar';
import { MessageItem } from './MessageItem';

interface ChatAreaProps {
  session: ChatSession;
  onUpdateMessages: (messages: Message[]) => void;
  onToggleSidebar: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ session, onUpdateMessages, onToggleSidebar }) => {
  const [isThinking, setIsThinking] = useState(true); 
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const teamsFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.messages, isLoading]);

  const handleSendMessage = async (text: string, attachments?: Attachment[], specialPrompt?: string) => {
    if (!text.trim() && (!attachments || attachments.length === 0) && !specialPrompt) return;

    const userText = text || (specialPrompt ? "جاري معالجة الجلسة الأكاديمية..." : "");
    const finalApiPrompt = specialPrompt ? `${specialPrompt}\n\n${text}` : text;

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      text: userText,
      attachments,
    };

    const updatedMessages = [...session.messages, userMsg];
    const apiMessages = [...session.messages, { ...userMsg, text: finalApiPrompt }];
    
    onUpdateMessages(updatedMessages);
    setIsLoading(true);

    const botMsgId = uuidv4();
    const botMsg: Message = {
      id: botMsgId,
      role: 'model',
      text: '',
      isThinking: isThinking
    };
    
    let currentBotText = '';
    const finalMessages = [...updatedMessages, botMsg];
    onUpdateMessages(finalMessages);

    try {
      const stream = gemini.streamResponse(apiMessages, isThinking, useWebSearch);
      for await (const chunk of stream) {
        currentBotText += chunk;
        onUpdateMessages(
          finalMessages.map(m => m.id === botMsgId ? { ...m, text: currentBotText } : m)
        );
      }
    } catch (err) {
      console.error(err);
      onUpdateMessages(
        finalMessages.map(m => m.id === botMsgId ? { ...m, text: "خطأ في النظام: فشل المحرك الأكاديمي في المعالجة. حاول مرة أخرى." } : m)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamsFileClick = () => {
    teamsFileInputRef.current?.click();
  };

  const handleTeamsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = (event.target?.result as string).split(',')[1];
      const attachment: Attachment = {
        mimeType: file.type,
        data,
        name: file.name
      };
      
      const teamsPrompt = "أنت محلل أكاديمي متخصص. هذا تسجيل لفيديو من حصة على Microsoft Teams. يرجى مشاهدة الفيديو وتقديم تلخيص شامل يتضمن: 1) أهم المواضيع التي نوقشت، 2) القرارات المتخذة، 3) المهام المطلوبة من الطلاب، 4) أي تواريخ مهمة ذكرت. كن دقيقاً جداً في نقلك للمعلومات.";
      
      handleSendMessage("قمت برفع تسجيل حصة التيمز للتلخيص.", [attachment], teamsPrompt);
    };
    reader.readAsDataURL(file);
    // Clear input
    e.target.value = '';
  };

  const solvePrompt = "SYSTEM INSTRUCTION: You are an elite academic solver. Your goal is 100% accuracy. Break down the logic step-by-step, verify every calculation twice, and provide the most rigorous answer possible in high-quality academic format. If the user provides an image or text of a question, solve it with extreme precision and clarity.";

  return (
    <div className="flex flex-col h-full bg-[#131314] relative text-right" dir="rtl">
      {/* Hidden Teams File Input */}
      <input 
        type="file" 
        ref={teamsFileInputRef} 
        onChange={handleTeamsFileChange} 
        accept="video/*" 
        className="hidden" 
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 md:px-8 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={onToggleSidebar}
            className="flex items-center gap-2 bg-[#1e1f20]/95 backdrop-blur-2xl hover:bg-[#3c4043] px-5 py-3 rounded-[20px] transition-all border border-[#3c4043] shadow-2xl group active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            <span className="text-sm font-bold font-google">الإدارة</span>
          </button>
          <div className="flex items-center gap-3 bg-[#1e1f20]/95 backdrop-blur-2xl px-5 py-3 rounded-[20px] border border-[#3c4043] shadow-lg">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 font-black text-sm font-google tracking-tighter">OMAR AI • ACADEMIC PRO</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-28 pb-10 px-4 md:px-0 scrollbar-hide"
      >
        <div className="max-w-4xl mx-auto w-full">
          {session.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
              <div className="text-center space-y-5 px-4">
                <h1 className="text-[64px] md:text-[84px] font-black leading-tight tracking-tighter font-google animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <span className="omar-gradient-text block">OMAR AI</span>
                </h1>
              </div>
            </div>
          ) : (
            <div className="space-y-12 pb-20">
              {session.messages.map(msg => (
                <MessageItem key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex items-start gap-6 animate-pulse flex-row-reverse">
                  <div className="w-14 h-14 rounded-[22px] flex items-center justify-center bg-[#3c4043] shimmer-active">
                    <span className="text-[12px] text-white/50 font-black font-google">عمر</span>
                  </div>
                  <div className="space-y-4 flex-1 pt-4 text-right">
                    <div className="h-4 bg-[#3c4043] rounded-full w-[100%] shimmer-active opacity-60"></div>
                    <div className="h-4 bg-[#3c4043] rounded-full w-[85%] shimmer-active opacity-40"></div>
                    <div className="h-4 bg-[#3c4043] rounded-full w-[40%] shimmer-active opacity-20"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Control Surface */}
      <div className="w-full max-w-5xl mx-auto pb-6 px-4 md:px-8 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-5 overflow-x-auto py-1 scrollbar-hide">
           <ToggleButton 
              active={isThinking} 
              onClick={() => setIsThinking(!isThinking)} 
              label="منطق فائق" 
              icon="🧠" 
              color="blue"
              small
           />
           <ToggleButton 
              active={useWebSearch} 
              onClick={() => setUseWebSearch(!useWebSearch)} 
              label="بحث فوري" 
              icon="🌐" 
              color="green"
              small
           />
           <div className="h-6 w-[1px] bg-[#3c4043] mx-2"></div>
           
           {/* Teams Summary Button */}
           <button 
             onClick={handleTeamsFileClick}
             className="flex items-center gap-2 bg-[#4b53bc] hover:bg-[#5a62d1] px-5 py-2.5 rounded-[20px] text-[11px] font-black text-white border border-[#4b53bc]/50 transition-all hover:scale-105 shadow-xl font-google active:scale-95"
           >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 11.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm4.5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm4-10.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5h8Z" opacity=".2"/>
               <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10ZM4 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8-8-3.58-8-8Zm14.5-1c.28 0 .5.22.5.5v4c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5h1ZM7.5 11c.28 0 .5.22.5.5v4c0 .28-.22.5-.5.5h-1c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5h1ZM13 8.5c0 .83-.67 1.5-1.5 1.5S10 9.33 10 8.5 10.67 7 11.5 7 13 7.67 13 8.5Zm3.5 1c0 .83-.67 1.5-1.5 1.5S13.5 10.33 13.5 9.5 14.17 8 15 8s1.5.67 1.5 1.5ZM9 9.5c0 .83-.67 1.5-1.5 1.5S6 10.33 6 9.5 6.67 8 7.5 8 9 8.67 9 9.5Z" fill="white"/>
             </svg>
             تلخيص حصة التيمز
           </button>

           <button 
             onClick={() => handleSendMessage("", undefined, solvePrompt)}
             className="flex items-center gap-2 bg-[#1e1f20] hover:bg-[#3c4043] px-5 py-2.5 rounded-[20px] text-[11px] font-black text-[#8ab4f8] border border-[#8ab4f8]/30 transition-all hover:scale-105 shadow-xl font-google active:scale-95"
           >
             🎯 حل الأسئلة بدقة 100%
           </button>
           <button 
             onClick={() => handleSendMessage("", undefined, "SYSTEM: Perform a deep structural audit of the current context. Provide high-accuracy results.")}
             className="flex items-center gap-2 bg-[#1e1f20] hover:bg-[#3c4043] px-5 py-2.5 rounded-[20px] text-[11px] font-black text-[#c4c7c5] border border-[#3c4043] transition-all hover:scale-105 shadow-xl font-google active:scale-95"
           >
             ⚡ تدقيق المحتوى
           </button>
        </div>

        <PromptBar onSend={handleSendMessage} isLoading={isLoading} />
        <p className="text-[10px] text-[#c4c7c5] text-center mt-5 opacity-40 font-black uppercase tracking-[0.3em] font-google">
          OMAR AI • محرك النزاهة الأكاديمية • إصدار 4.5
        </p>
      </div>
    </div>
  );
};

const ToggleButton = ({ active, onClick, label, icon, color, small }: { active: boolean, onClick: () => void, label: string, icon: string, color: 'blue'|'green', small?: boolean }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 rounded-[20px] transition-all border shadow-lg font-black font-google active:scale-95 ${
      small ? 'px-4 py-2.5 text-[11px]' : 'px-8 py-5 text-lg w-full h-[102px]'
    } ${
      active 
        ? (color === 'blue' ? 'bg-[#8ab4f8] text-[#131314] border-transparent ring-2 ring-[#8ab4f8]/50 shadow-blue-500/20' : 'bg-emerald-500 text-[#131314] border-transparent ring-2 ring-emerald-400/50 shadow-emerald-500/20')
        : 'bg-[#1e1f20] text-[#c4c7c5] border-[#3c4043] hover:bg-[#3c4043] hover:text-white'
    }`}
  >
    <span className={small ? 'text-sm' : 'text-3xl'}>{icon}</span>
    <span className="whitespace-nowrap">{label}</span>
  </button>
);
