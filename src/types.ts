export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface JobContext {
  company: string;
  role: string;
}

export type Provider = 'gemini' | 'openai';
export type AppMode = 'coach' | 'mock';

export interface SetupData {
  resumeText: string;
  fileName: string;
  jobContext: JobContext;
  provider: Provider;
  geminiKey: string;
  openaiKey: string;
  mode: AppMode;
}
