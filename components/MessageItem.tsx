
import React, { useState } from 'react';
import { Message } from '../types';
import { gemini } from '../services/gemini';

interface MessageItemProps {
  message: Message;
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isUser = message.role === 'user';

  const handleSpeak = async () => {
    if (isSpeaking) { setIsSpeaking(false); return; }
    setIsSpeaking(true);
    try {
      const audioBase64 = await gemini.generateSpeech(message.text);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioData = decodeBase64(audioBase64);
      const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsSpeaking(false);
      source.start();
    } catch (err) { console.error(err); setIsSpeaking(false); }
  };

  return (
    <div className={`flex items-start gap-5 md:gap-8 animate-in slide-in-from-bottom-6 duration-700 group ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Avatar Section */}
      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[28px] flex-shrink-0 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all transform group-hover:scale-105 border-2 ${isUser ? 'bg-[#3c4043] border-[#5f6368]' : 'bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] border-white/10 rotate-2'}`}>
        {isUser ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-[#e3e3e3]"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        ) : (
          <div className="flex flex-col items-center -space-y-1 font-google select-none">
             <span className="text-[11px] font-black text-white leading-none">OMAR</span>
             <span className="text-[16px] font-black text-white leading-none">AI</span>
          </div>
        )}
      </div>
      
      {/* Message Content Section */}
      <div className={`flex-1 space-y-6 max-w-full overflow-hidden ${isUser ? 'text-right' : 'text-right pt-2'}`}>
        {/* Attachment Display */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex gap-5 flex-wrap mb-6 justify-end">
            {message.attachments.map((att, i) => (
              <div key={i} className="relative group/att rounded-[28px] overflow-hidden border-2 border-[#3c4043] shadow-2xl bg-[#1e1f20] min-w-[120px]">
                {att.mimeType.startsWith('image/') ? (
                  <img 
                    src={`data:${att.mimeType};base64,${att.data}`} 
                    alt="مرفق" 
                    className="max-w-[400px] h-auto object-contain transition-transform group-hover/att:scale-[1.03] duration-500" 
                  />
                ) : (
                  <div className="p-6 flex flex-col items-center gap-3">
                    <span className="text-4xl">📄</span>
                    <span className="text-xs font-bold text-[#c4c7c5] max-w-[150px] truncate">{att.name || 'ملف تم تحليله'}</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">فحص أكاديمي</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text Box */}
        <div className={`text-[#e3e3e3] text-[18px] md:text-[21px] leading-[1.8] whitespace-pre-wrap font-medium selection:bg-blue-500/30 selection:text-white`}>
          {message.isThinking && !isUser && (
            <div className="mb-5 flex items-center gap-3 bg-blue-500/10 w-fit px-5 py-2 rounded-full border border-blue-500/20 animate-pulse mr-auto">
               <span className="text-sm">🧠</span>
               <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest font-google">المحرك: جاري التفكير بعمق...</span>
            </div>
          )}
          <div className="prose prose-invert max-w-none font-inter text-inherit">
            {message.text}
          </div>
        </div>

        {/* Actions Bar */}
        {!isUser && message.text && (
          <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity pt-6 border-t border-[#3c4043]/30 justify-end">
            <ActionIcon onClick={handleSpeak} icon={<ListenIcon active={isSpeaking} />} title="استماع للحل" />
            <ActionIcon onClick={() => navigator.clipboard.writeText(message.text)} icon={<CopyIcon />} title="نسخ للملاحظات" />
            <div className="h-6 w-[1px] bg-[#3c4043] mx-2"></div>
            <ActionIcon onClick={() => {}} icon={<DislikeIcon />} title="تحقق من الدقة" />
          </div>
        )}
      </div>
    </div>
  );
};

const ActionIcon = ({ onClick, icon, title }: { onClick: () => void, icon: React.ReactNode, title: string }) => (
  <button 
    onClick={onClick} 
    className="p-3.5 hover:bg-[#3c4043] rounded-[18px] text-[#c4c7c5] transition-all bg-[#1e1f20] border border-[#3c4043] shadow-md hover:text-[#8ab4f8] hover:border-[#8ab4f8]/30 active:scale-90" 
    title={title}
  >
    {icon}
  </button>
);

const ListenIcon = ({ active }: { active: boolean }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#8ab4f8" : "currentColor"} strokeWidth="2.5"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14" className={active ? "animate-pulse" : ""}/></svg>;
const CopyIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const DislikeIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7L2 14c0 1.1.9 2 2 2h6zM22 2h-3v10h3V2z"/></svg>;
