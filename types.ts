
export type Role = 'user' | 'model';

export interface Attachment {
  mimeType: string;
  data: string; // base64
  name?: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  isThinking?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
