import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, User, Send, Sparkles, RefreshCw, AlertCircle, FileText, 
  Building, Briefcase, ChevronRight, HelpCircle, ArrowLeft, Trophy, Info,
  GraduationCap, BookOpen, Compass, ListTodo, ShieldAlert
} from 'lucide-react';
import { Message, SetupData } from '../types';

interface ChatPanelProps {
  setupData: SetupData;
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  onGoBack: () => void;
  onToggleMode?: (newMode: 'coach' | 'mock') => void;
}

// Helper to extract bracketed feedback and return clean question text
const parseRecruiterMessage = (text: string) => {
  // Regex to match anything inside brackets like [Feedback: ...] or [some feedback]
  const feedbackRegex = /\[([^\]]+)\]/g;
  const matches = [...text.matchAll(feedbackRegex)];
  
  if (matches.length > 0) {
    const feedbackList = matches.map(m => m[1]);
    // Remove the brackets and content from the main text
    const cleanText = text.replace(feedbackRegex, '').trim();
    return {
      feedback: feedbackList[0], // Extract first feedback block
      question: cleanText
    };
  }
  
  return {
    feedback: null,
    question: text
  };
};

export default function ChatPanel({
  setupData,
  messages,
  onSendMessage,
  isLoading,
  onGoBack,
  onToggleMode
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Pre-fill STAR structures or standard professional answers
  const insertStarTemplate = () => {
    setInputText((prev) => 
      prev + "Situation: [Briefly describe the context/challenge]\nTask: [What needed to be achieved]\nAction: [What specific steps you took]\nResult: [Quantifiable outcomes and learnings]"
    );
  };

  const handleQuickPrepAction = (promptText: string) => {
    if (isLoading) return;
    onSendMessage(promptText);
  };

  const getQuestionCount = () => {
    // Each user message counts as a completed question cycle
    return messages.filter(m => m.role === 'user').length;
  };

  const isCoachMode = setupData.mode === 'coach';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 max-w-7xl mx-auto h-[calc(100vh-8.5rem)]" id="chat-panel-container">
      
      {/* Session Metadata Sidebar */}
      <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1 h-fit lg:sticky lg:top-24">
        
        {/* Interactive Mode Switcher */}
        {onToggleMode && (
          <div className="rounded-xl border border-slate-800 bg-[#0D0D0D] p-4 shadow-xs">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-slate-500" />
              Active Workspace Mode
            </h4>
            
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#161616] border border-slate-800/80">
              <button
                type="button"
                onClick={() => onToggleMode('coach')}
                className={`rounded-md py-2 px-1 text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  isCoachMode
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-xs'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Prep Helper
              </button>
              
              <button
                type="button"
                onClick={() => onToggleMode('mock')}
                className={`rounded-md py-2 px-1 text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  !isCoachMode
                    ? 'bg-amber-600/10 text-amber-400 border border-amber-500/20 shadow-xs'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                Mock Interview
              </button>
            </div>
            
            <p className="text-[10px] text-slate-500 mt-2.5 leading-normal">
              {isCoachMode 
                ? "💡 You are in Prep/Study mode. You can ask questions, request sample answers, and receive advice."
                : "🎭 You are in Simulator mode. Practice answering questions with formal feedback tips."}
            </p>
          </div>
        )}

        {/* Job Context Overview */}
        <div className="rounded-xl border border-slate-800 bg-[#0D0D0D] p-4 shadow-xs">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-slate-500" />
            Active Session Context
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Building className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-500 font-medium">Target Company</p>
                <p className="text-xs font-semibold text-slate-200">{setupData.jobContext.company}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FileText className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-500 font-medium">Role Target</p>
                <p className="text-xs font-semibold text-slate-200 line-clamp-2" title={setupData.jobContext.role}>
                  {setupData.jobContext.role}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2.5 border-t border-slate-800">
              <Trophy className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-500 font-medium">Progress</p>
                <p className="text-xs font-semibold text-slate-200">
                  {getQuestionCount()} Questions Answered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coach Toolkit (Available only in coach mode) */}
        {isCoachMode && (
          <div className="rounded-xl border border-indigo-950 bg-[#0D0D0D] p-4 shadow-xs space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
              Coach Toolkit
            </h4>
            
            <p className="text-[10px] text-slate-400 leading-normal">
              Click a prep-action below to have your AI Coach analyze your context and respond instantly:
            </p>

            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickPrepAction("What are the top 5 interview questions likely to be asked for this position based on my resume?")}
                className="w-full text-left rounded-lg bg-[#161616] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium py-2 px-2.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                📋 Predictive Top 5 Questions
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickPrepAction("Based on my resume, design a detailed STAR framework (Situation, Task, Action, Result) model answer for a key project I should talk about.")}
                className="w-full text-left rounded-lg bg-[#161616] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium py-2 px-2.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                📝 Draft a Model STAR Answer
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickPrepAction("Analyze my resume specifically for any gaps, weaknesses, or mismatch compared to the job role requirements, and tell me how to explain them proactively.")}
                className="w-full text-left rounded-lg bg-[#161616] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium py-2 px-2.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                🔍 Audit Gaps in my Resume
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickPrepAction("Explain the primary candidate filters, technical expectations, and culture values that recruiters at this target company focus on.")}
                className="w-full text-left rounded-lg bg-[#161616] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium py-2 px-2.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                🏢 Target Company Insight
              </button>
            </div>
          </div>
        )}

        {/* Dynamic STAR Coach Tips */}
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4 shadow-xs">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            STAR Methodology Coach
          </h4>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
            Structured answers demonstrate systemic thinking. Click below to inject a guided <strong>STAR template</strong> into your active input canvas.
          </p>
          <button
            type="button"
            onClick={insertStarTemplate}
            id="insert-star-template-btn"
            className="w-full rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-3 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            Insert STAR Template
          </button>
        </div>

        {/* Go back */}
        <button
          onClick={onGoBack}
          id="back-to-settings-btn"
          className="flex items-center justify-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium py-2 border border-slate-800 rounded-lg bg-[#161616] hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Edit Interview Settings
        </button>
      </div>


      {/* Main Chat Interface */}
      <div className="lg:col-span-9 flex flex-col rounded-2xl border border-slate-800 bg-[#0D0D0D] shadow-sm overflow-hidden order-1 lg:order-2 h-full">
        {/* Recruiter / Coach Header */}
        <div className="border-b border-slate-800 bg-[#111111] px-4 py-3.5 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-white ${
              isCoachMode ? 'bg-indigo-600' : 'bg-amber-600'
            }`}>
              {isCoachMode ? <GraduationCap className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#111111] ${isCoachMode ? 'bg-indigo-400' : 'bg-emerald-500'}`}></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-200">
                  {isCoachMode ? 'AI Preparation Helper & Coach' : 'Expert Recruiter AI'}
                </h3>
                <span className="rounded-md bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 capitalize">
                  {setupData.provider} engine
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {isCoachMode 
                  ? `Helping you prepare for ${setupData.jobContext.company}`
                  : `Conducting mock interview for ${setupData.jobContext.company}`}
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isCoachMode ? 'bg-indigo-400' : 'bg-emerald-500'}`}></span>
            {isCoachMode ? 'COACH ACTIVE' : 'SIMULATION LIVE'}
          </div>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0 bg-[#0A0A0A]">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              const isSystemNote = msg.content.startsWith("SYSTEM NOTE:");
              const parsed = isAssistant ? parseRecruiterMessage(msg.content) : null;

              if (isSystemNote) {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center my-3"
                  >
                    <span className="rounded-full bg-indigo-500/5 px-3.5 py-1 text-[10px] font-mono text-indigo-400/80 border border-indigo-500/10">
                      {msg.content.replace("SYSTEM NOTE:", "").trim()}
                    </span>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3 max-w-3xl ${isAssistant ? '' : 'ml-auto flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-medium shadow-xs ${
                    isAssistant 
                      ? isCoachMode
                        ? 'bg-indigo-950/20 text-indigo-400 border-indigo-500/20' 
                        : 'bg-[#161616] text-amber-400 border-slate-800'
                      : 'bg-indigo-600 text-white border-indigo-500'
                  }`}>
                    {isAssistant ? isCoachMode ? <GraduationCap className="h-4 w-4" /> : <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  {/* Bubble Container */}
                  <div className="space-y-2 max-w-[85%]">
                    {/* Role name and time */}
                    <div className={`flex items-center gap-2 text-[10px] text-slate-500 ${isAssistant ? '' : 'justify-end'}`}>
                      <span className="font-semibold text-slate-400">
                        {isAssistant ? isCoachMode ? 'AI Coach' : 'Interviewer' : 'Candidate (You)'}
                      </span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Content Speech Bubble */}
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      isAssistant 
                        ? 'bg-[#161616] border border-slate-800 text-slate-200 rounded-tl-none' 
                        : 'bg-indigo-600 text-white rounded-tr-none font-medium'
                    }`}>
                      
                      {/* If assistant, optionally render feedback tip and cleaned question */}
                      {isAssistant && parsed ? (
                        <div className="space-y-3">
                          {/* Render Cleaned Question Text */}
                          <div className="whitespace-pre-wrap">{parsed.question}</div>

                          {/* Render Beautiful Extracted Coach Feedback widget */}
                          {parsed.feedback && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mt-2.5 rounded-xl bg-emerald-950/15 border border-emerald-900/30 p-3 flex gap-2 text-xs text-emerald-300"
                            >
                              <Info className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <div className="space-y-0.5 text-left">
                                <p className="font-bold text-emerald-400 tracking-wider uppercase text-[9px]">
                                  {isCoachMode ? 'Coach Suggestion & Improved Answer' : 'Recruiter Coaching Tip'}
                                </p>
                                <p className="leading-relaxed text-slate-300 font-medium">{parsed.feedback}</p>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-lg">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                isCoachMode ? 'bg-indigo-950/20 text-indigo-400 border-indigo-500/20' : 'bg-[#161616] text-indigo-400 border-slate-800'
              }`}>
                {isCoachMode ? <GraduationCap className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className="space-y-2 w-full">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-400">
                    {isCoachMode ? 'AI Coach' : 'Interviewer'}
                  </span>
                  <span>•</span>
                  <span>Thinking...</span>
                </div>
                <div className="rounded-2xl rounded-tl-none bg-[#161616] border border-slate-800 p-4 shadow-xs w-full">
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs font-medium text-slate-500 animate-pulse">
                      {isCoachMode 
                        ? 'Formulating step-by-step prep advice & drafting feedback...'
                        : 'Analyzing answer metrics & framing feedback...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Message Input Compositing Box */}
        <div className="border-t border-slate-800 bg-[#0D0D0D] p-4">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              id="chat-textarea"
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                isCoachMode
                  ? "Ask your coach anything, e.g. 'How do I answer behavioral questions?' or practice an answer..."
                  : "Draft your professional answer... (Shift + Enter for new lines, Enter to send)"
              }
              className="w-full resize-none rounded-xl border border-slate-800 bg-[#161616] py-3.5 pl-4 pr-14 text-sm text-slate-100 placeholder-slate-600 shadow-xs focus:border-indigo-500 focus:bg-[#111111] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all animate-none"
            />
            
            <div className="absolute right-3.5 bottom-5 flex items-center gap-2">
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                id="send-message-btn"
                className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-xs transition-all ${
                  inputText.trim() && !isLoading
                    ? 'bg-white text-black hover:bg-slate-200 cursor-pointer active:scale-95'
                    : 'bg-slate-850 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
          
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {isCoachMode
                ? "💡 Pro-Tip: Try typing 'How can I explain my experience at TechCorp?' or 'Give me a model STAR answer'."
                : "💡 Recruiter Tip: Take your time. Be specific and back up your assertions with concrete numbers."}
            </span>
            <span className="hidden sm:inline font-mono text-[10px]">Enter to send</span>
          </div>
        </div>

      </div>

    </div>
  );
}
