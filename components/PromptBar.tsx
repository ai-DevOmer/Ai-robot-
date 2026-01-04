
import React, { useState, useRef } from 'react';
import { Attachment } from '../types';
import { gemini } from '../services/gemini';

interface PromptBarProps {
  onSend: (text: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
}

export const PromptBar: React.FC<PromptBarProps> = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files) as File[]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = (event.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          mimeType: file.type,
          data,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const transcription = await gemini.transcribeAudio(base64);
            if (transcription) setText(prev => prev + (prev ? ' ' : '') + transcription);
          } catch (err) { console.error(err); }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && attachments.length === 0) return;
    onSend(text, attachments);
    setText('');
    setAttachments([]);
  };

  return (
    <div className="w-full flex flex-col gap-3" dir="rtl">
      {/* Enhanced File Previews */}
      {attachments.length > 0 && (
        <div className="flex gap-3 px-6 flex-wrap animate-in fade-in slide-in-from-bottom-2 duration-300">
          {attachments.map((att, i) => (
            <div key={i} className="relative group rounded-2xl overflow-hidden border border-[#3c4043] w-20 h-20 shadow-2xl bg-[#1e1f20] flex flex-col items-center justify-center p-1">
              {att.mimeType.startsWith('image/') ? (
                <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">📄</span>
                  <span className="text-[8px] font-black text-[#c4c7c5] truncate w-16 text-center">{att.name || 'ملف'}</span>
                </div>
              )}
              <button 
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute top-1 left-1 bg-black/80 hover:bg-black rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Surface */}
      <div className="relative group flex flex-col bg-[#1e1f20] hover:bg-[#252729] focus-within:bg-[#252729] rounded-[36px] transition-all p-3 shadow-2xl border border-transparent focus-within:border-[#3c4043]">
        <div className="flex items-end gap-2 px-3">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 hover:bg-[#3c4043] rounded-full text-[#c4c7c5] transition-all flex-shrink-0 active:scale-90"
            title="ارفع صور، ملفات PDF، فيديوهات"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          
          <input 
            ref={fileInputRef} 
            type="file" 
            multiple 
            accept="image/*,application/pdf,video/*,text/*" 
            onChange={handleFileChange} 
            className="hidden" 
          />

          <textarea
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            placeholder="اسأل عمر أي شيء أكاديمي أو ارفع ملفاتك..."
            className="flex-1 bg-transparent border-none outline-none resize-none px-2 py-4 text-[#e3e3e3] placeholder-[#c4c7c5]/50 max-h-[250px] text-[16px] font-inter leading-relaxed text-right"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          <div className="flex items-center gap-2 p-1">
            <button 
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              className={`p-3.5 hover:bg-[#3c4043] rounded-full transition-all flex-shrink-0 active:scale-90 ${isRecording ? 'text-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-[#c4c7c5]'}`}
              title="إملاء صوتي"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
            </button>

            {(text.trim() || attachments.length > 0) && (
              <button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="p-4 bg-[#8ab4f8] hover:bg-[#a2c5fd] rounded-full text-[#131314] transition-all disabled:opacity-30 shadow-lg active:scale-90"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
