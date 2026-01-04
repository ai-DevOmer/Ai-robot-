
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { Message, Attachment } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async *streamResponse(
    messages: Message[], 
    isThinking: boolean = false, 
    useWebSearch: boolean = false
  ) {
    // We use gemini-3-pro-preview for highest quality academic reasoning
    const modelName = 'gemini-3-pro-preview';
    
    const contents = messages.map(msg => {
      const parts: any[] = [{ text: msg.text }];
      if (msg.attachments) {
        msg.attachments.forEach(att => {
          parts.push({
            inlineData: { mimeType: att.mimeType, data: att.data }
          });
        });
      }
      return { role: msg.role === 'user' ? 'user' : 'model', parts };
    });

    try {
      const config: any = {
        thinkingConfig: isThinking ? { thinkingBudget: 32768 } : undefined,
      };

      if (useWebSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const stream = await this.ai.models.generateContentStream({
        model: modelName,
        contents,
        config
      });

      for await (const chunk of stream) {
        const text = chunk.text || "";
        yield text;
      }
    } catch (error) {
      console.error("Gemini Stream Error:", error);
      throw error;
    }
  }

  async generateSpeech(text: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    } catch (error) {
      console.error("Gemini TTS Error:", error);
      throw error;
    }
  }

  async transcribeAudio(audioBase64: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: "Transcribe this audio precisely for study notes." },
            { inlineData: { mimeType: 'audio/wav', data: audioBase64 } }
          ]
        }
      });
      return response.text || "";
    } catch (error) {
      console.error("Gemini Transcription Error:", error);
      throw error;
    }
  }
}

export const gemini = new GeminiService();
