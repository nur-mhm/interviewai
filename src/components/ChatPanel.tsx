import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, User, Send, Sparkles, RefreshCw, AlertCircle, FileText, 
  Building, Briefcase, ChevronRight, HelpCircle, ArrowLeft, Trophy, Info,
  GraduationCap, BookOpen, Compass, ListTodo, ShieldAlert, Mic, MicOff,
  CheckCircle2, AlertTriangle, Lightbulb, TrendingUp
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
  const [loadingStep, setLoadingStep] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const [isAnalysisOpen, setIsAnalysisOpen] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiPerformance, setAiPerformance] = useState<{
    strengths: string[];
    improvements: string[];
    overallScore: number;
    summary: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'heuristic' | 'ai'>('heuristic');

  // Dynamic heuristic analyzer that processes chat history in real-time
  const getHeuristicAnalysis = () => {
    const userMessages = messages.filter(m => m.role === 'user');
    const totalAnswers = userMessages.length;
    
    const strengths: string[] = [];
    const improvements: string[] = [];
    let score = 50;
    
    if (setupData.resumeText) {
      strengths.push("Resume parsed successfully & aligned with role target.");
      score += 15;
    } else {
      improvements.push("Add a detailed resume profile to tailor the feedback precisely.");
    }

    let totalWords = 0;
    let hasShortAnswer = false;
    let hasQuantifiableMetrics = false;
    let hasStarKeywords = false;

    userMessages.forEach(msg => {
      const text = msg.content.toLowerCase();
      const words = msg.content.trim().split(/\s+/).length;
      totalWords += words;

      if (words < 30 && words > 3) {
        hasShortAnswer = true;
      }

      // Look for numbers, %, or common metrics words
      if (/\b\d+(%|\b)/.test(text) || text.includes('%') || text.includes('percent') || text.includes('million') || text.includes('thousand') || text.includes('metrics') || text.includes('kpi')) {
        hasQuantifiableMetrics = true;
      }

      // Look for STAR keywords
      if (text.includes('situation') || text.includes('task') || text.includes('action') || text.includes('result') || text.includes('s:') || text.includes('t:') || text.includes('a:') || text.includes('r:')) {
        hasStarKeywords = true;
      }
    });

    const avgWords = totalAnswers > 0 ? Math.round(totalWords / totalAnswers) : 0;

    if (totalAnswers > 0) {
      if (avgWords >= 60) {
        strengths.push(`Rich depth: responses average ${avgWords} words.`);
        score += 20;
      } else if (hasShortAnswer) {
        improvements.push("Elaborate further: describe your context and process more thoroughly.");
        score -= 10;
      } else {
        strengths.push(`Steady explanation length (Avg: ${avgWords} words).`);
        score += 10;
      }

      if (hasQuantifiableMetrics) {
        strengths.push("Quantified accomplishments: uses metrics/numbers to prove impact.");
        score += 15;
      } else {
        improvements.push("Mention hard metrics: state exact %, revenue, speeds, or sizes.");
      }

      if (hasStarKeywords) {
        strengths.push("STAR storytelling: structured your descriptions well.");
        score += 15;
      } else {
        improvements.push("Adopt the STAR method: explicitly separate Situation, Task, Action, Result.");
      }
    } else {
      improvements.push("Practice answering your first mock question to populate live behavioral metrics.");
    }

    const finalScore = Math.min(100, Math.max(0, score));

    let summary = "";
    if (totalAnswers === 0) {
      summary = `Your mock interview preparation dashboard is ready! Once you start answering questions, this board will analyze your speaking length, structural metrics, and STAR compliance.`;
    } else if (finalScore >= 80) {
      summary = `Outstanding! Your responses show an excellent balance of structure, elaboration, and quantifiable results. Keep this up!`;
    } else if (finalScore >= 65) {
      summary = `Good progress! Your answers are informative, but you can elevate them by wrapping them tightly in the STAR template and adding specific metrics.`;
    } else {
      summary = `Keep practicing. Try explaining your exact actions and the quantifiable results of your work in greater depth.`;
    }

    return {
      strengths,
      improvements,
      overallScore: finalScore,
      summary
    };
  };

  const runAiPerformanceAudit = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await fetch('/api/analyze-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
          provider: setupData.provider,
          geminiKey: setupData.geminiKey,
          openaiKey: setupData.openaiKey,
          resume: setupData.resumeText,
          jobContext: setupData.jobContext,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${response.status})`);
      }

      const data = await response.json();
      setAiPerformance({
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        overallScore: typeof data.overallScore === 'number' ? data.overallScore : 80,
        summary: data.summary || "No executive summary was generated."
      });
      setActiveTab('ai');
    } catch (err: any) {
      console.error("AI Audit Error:", err);
      setAnalysisError(err?.message || "An unexpected error occurred while analyzing performance.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const heuristicAnalysis = getHeuristicAnalysis();

  const activePerformance = activeTab === 'ai' && aiPerformance 
    ? aiPerformance 
    : {
        strengths: heuristicAnalysis.strengths,
        improvements: heuristicAnalysis.improvements,
        overallScore: heuristicAnalysis.overallScore,
        summary: heuristicAnalysis.summary
      };

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false);
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const toggleRecording = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setSpeechFeedback("Voice input is not supported in this browser. Try Chrome or Safari.");
      setSpeechSupported(false);
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      setIsRecording(false);
      setSpeechFeedback(null);
    } else {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        const baseText = inputText;

        recognition.onstart = () => {
          setIsRecording(true);
          setSpeechFeedback("Listening... Speak clearly to answer.");
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentWritten = baseText ? (baseText.trim() + ' ') : '';
          setInputText(currentWritten + finalTranscript + interimTranscript);
        };

        recognition.onerror = (err: any) => {
          console.error("Speech Recognition Error:", err);
          setIsRecording(false);
          const errorCode = err.error || '';
          
          if (errorCode === 'not-allowed') {
            setSpeechFeedback("Microphone access blocked. Click the 'Open in New Tab' button in the top-right to run outside the preview iframe and permit mic usage!");
          } else if (errorCode === 'no-speech') {
            setSpeechFeedback("No speech detected. Please speak clearly into your microphone.");
          } else if (errorCode === 'aborted') {
            setSpeechFeedback("Speech recognition session was ended.");
          } else {
            setSpeechFeedback(`Speech recognition error (${errorCode || 'unknown'}). Please verify mic hardware, or click 'Open in New Tab' to run outside the sandbox!`);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          setSpeechFeedback(null);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e: any) {
        console.error("Failed to start Speech Recognition", e);
        setSpeechFeedback("Could not initialize voice-to-text. Please try again.");
        setIsRecording(false);
      }
    }
  };

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 1800);

    return () => clearInterval(interval);
  }, [isLoading]);

  const coachSteps = [
    'Mapping your resume strengths...',
    'Consulting target company values...',
    'Structuring STAR advice model...',
    'Polishing communication strategy...'
  ];

  const interviewerSteps = [
    'Evaluating response alignment...',
    'Formulating next structured question...',
    'Calculating feedback brackets...',
    'Finalizing interview scores...'
  ];

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
    const timer = setTimeout(scrollToBottom, 120);
    return () => clearTimeout(timer);
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
      <div className={`${isAnalysisOpen ? 'lg:col-span-6' : 'lg:col-span-9'} flex flex-col rounded-2xl border border-slate-800 bg-[#0D0D0D] shadow-sm overflow-hidden order-1 lg:order-2 h-full`}>
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

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isAnalysisOpen 
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="Toggle Performance Analysis Board"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>{isAnalysisOpen ? 'Hide Analysis' : 'Show Analysis'}</span>
            </button>

            <div className="hidden sm:flex text-[11px] text-slate-500 items-center gap-1 font-mono">
              <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isCoachMode ? 'bg-indigo-400' : 'bg-emerald-500'}`}></span>
              {isCoachMode ? 'COACH ACTIVE' : 'SIMULATION LIVE'}
            </div>
          </div>
        </div>

        {/* Message Thread Scroll Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0 bg-[#0A0A0A]">
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
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 max-w-lg"
            >
              <div className="relative self-start mt-0.5">
                <motion.div 
                  className={`absolute inset-0 rounded-lg opacity-40 blur-[2px] ${isCoachMode ? 'bg-indigo-500' : 'bg-amber-500'}`}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-medium shadow-xs ${
                  isCoachMode ? 'bg-[#12121e] text-indigo-400 border-indigo-500/30' : 'bg-[#161616] text-amber-400 border-slate-800'
                }`}>
                  {isCoachMode ? <GraduationCap className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
              </div>

              <div className="space-y-2 w-full">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-400">
                    {isCoachMode ? 'AI Coach' : 'Interviewer'}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                    Analyzing Context...
                  </span>
                </div>

                <div className="rounded-2xl rounded-tl-none bg-[#121212]/95 border border-slate-800/80 p-4 shadow-md w-full">
                  <div className="flex items-center gap-4">
                    {/* Beautiful Custom Staggered Dots */}
                    <div className="flex items-center space-x-1.5 h-6 shrink-0 px-1">
                      <motion.div
                        className={`h-2 w-2 rounded-full ${isCoachMode ? 'bg-indigo-500' : 'bg-amber-500'}`}
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0
                        }}
                      />
                      <motion.div
                        className={`h-2 w-2 rounded-full ${isCoachMode ? 'bg-indigo-400' : 'bg-amber-400'}`}
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.15
                        }}
                      />
                      <motion.div
                        className={`h-2 w-2 rounded-full ${isCoachMode ? 'bg-indigo-300' : 'bg-amber-300'}`}
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.3
                        }}
                      />
                    </div>

                    {/* Smooth Text Swapper */}
                    <div className="overflow-hidden min-h-[16px] flex items-center">
                      <AnimatePresence mode="wait">
                        <motion.span 
                          key={loadingStep}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="text-xs font-medium text-slate-300 tracking-wide"
                        >
                          {isCoachMode 
                            ? coachSteps[loadingStep % coachSteps.length]
                            : interviewerSteps[loadingStep % interviewerSteps.length]}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Message Input Compositing Box */}
        <div className="border-t border-slate-800 bg-[#0D0D0D] p-4">
          <AnimatePresence>
            {speechFeedback && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                className={`mb-3 px-3 py-2 rounded-xl text-xs flex items-center gap-2 font-medium border ${
                  isRecording 
                    ? 'bg-indigo-950/20 text-indigo-300 border-indigo-500/20' 
                    : 'bg-red-950/20 text-red-400 border-red-500/20'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {isRecording && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isRecording ? 'bg-indigo-500' : 'bg-red-500'}`}></span>
                </span>
                <span className="flex-1">{speechFeedback}</span>
                {isRecording && (
                  <span className="text-[10px] text-indigo-400 font-mono animate-pulse">Speak now</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
              className="w-full resize-none rounded-xl border border-slate-800 bg-[#161616] py-3.5 pl-4 pr-24 text-sm text-slate-100 placeholder-slate-600 shadow-xs focus:border-indigo-500 focus:bg-[#111111] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all animate-none"
            />
            
            <div className="absolute right-3 bottom-4 flex items-center gap-2">
              {/* Voice-to-text toggle */}
              <button
                type="button"
                onClick={toggleRecording}
                id="voice-toggle-btn"
                className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-xs transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse border border-red-500'
                    : !speechSupported
                      ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                }`}
                title={
                  !speechSupported 
                    ? "Speech Recognition not supported in this browser" 
                    : isRecording 
                      ? "Stop voice recording" 
                      : "Practice verbalizing (Voice-to-Text)"
                }
                disabled={!speechSupported}
              >
                {!speechSupported ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>

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
                ? "💡 Pro-Tip: Tap 🎙️ to speak your answer and practice verbalizing comfortably."
                : "💡 Recruiter Tip: Tap 🎙️ to dictate, then review your answer before sending."}
            </span>
            <span className="hidden sm:inline font-mono text-[10px]">Enter to send</span>
          </div>
        </div>

      </div>

      {/* Performance Analysis Sidebar Panel */}
      {isAnalysisOpen && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 order-3 flex flex-col gap-4 h-full overflow-y-auto pb-4"
          id="performance-analysis-panel"
        >
          {/* Header Card */}
          <div className="rounded-xl border border-slate-800 bg-[#0D0D0D] p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Performance Board
              </h4>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                {activeTab === 'ai' ? 'AI AUDIT' : 'LIVE'}
              </span>
            </div>

            {/* Score circle */}
            <div className="flex flex-col items-center justify-center py-4 bg-slate-950/40 rounded-xl border border-slate-900">
              <div className="relative flex items-center justify-center h-24 w-24">
                {/* SVG circular progress */}
                <svg className="absolute transform -rotate-90 w-full h-full">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#1e293b"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={activePerformance.overallScore >= 80 ? '#10b981' : activePerformance.overallScore >= 65 ? '#f59e0b' : '#6366f1'}
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - activePerformance.overallScore / 100)}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="flex flex-col items-center justify-center z-10">
                  <span className="text-2xl font-extrabold text-white tracking-tight">
                    {activePerformance.overallScore}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Score
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-3 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span>Interactive Rating</span>
              </p>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#161616] border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('heuristic')}
                className={`rounded-md py-1.5 text-[10px] font-bold transition-all cursor-pointer text-center ${
                  activeTab === 'heuristic'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Live Metrics
              </button>
              <button
                type="button"
                onClick={() => {
                  if (aiPerformance) {
                    setActiveTab('ai');
                  } else {
                    runAiPerformanceAudit();
                  }
                }}
                className={`rounded-md py-1.5 text-[10px] font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  activeTab === 'ai'
                    ? 'bg-indigo-600/20 text-indigo-450 border border-indigo-500/20 shadow-xs'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Sparkles className="h-3 w-3 text-indigo-400" />
                AI Deep Audit
              </button>
            </div>

            {/* Executive summary */}
            <p className="text-[11px] text-slate-350 leading-relaxed bg-slate-900/35 p-3 rounded-lg border border-slate-850">
              {activePerformance.summary}
            </p>

            {/* Run Audit button */}
            <button
              type="button"
              disabled={isAnalyzing || messages.length === 0}
              onClick={runAiPerformanceAudit}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                messages.length === 0
                  ? 'bg-slate-850 text-slate-600 border border-slate-800 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Auditing History...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                  <span>{aiPerformance ? 'Re-Run AI Performance Audit' : 'Request AI Performance Audit'}</span>
                </>
              )}
            </button>
            {messages.length === 0 && (
              <p className="text-[9px] text-slate-600 text-center leading-normal">
                Answer at least 1 question to activate full AI performance audit.
              </p>
            )}
          </div>

          {/* Strengths Card */}
          <div className="rounded-xl border border-emerald-950/50 bg-emerald-950/10 p-4 shadow-sm space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Candidate Strengths
            </h4>
            
            {activePerformance.strengths.length > 0 ? (
              <ul className="space-y-2">
                {activePerformance.strengths.map((str, index) => (
                  <motion.li 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={index} 
                    className="text-[11px] text-slate-300 flex items-start gap-2 bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-2.5 leading-normal"
                  >
                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{str}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No key strengths registered yet.</p>
            )}
          </div>

          {/* Areas for Improvement Card */}
          <div className="rounded-xl border border-amber-950/50 bg-amber-950/10 p-4 shadow-sm space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Areas for Improvement
            </h4>
            
            {activePerformance.improvements.length > 0 ? (
              <ul className="space-y-2">
                {activePerformance.improvements.map((imp, index) => (
                  <motion.li 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={index} 
                    className="text-[11px] text-slate-300 flex items-start gap-2 bg-amber-950/20 border border-amber-900/30 rounded-lg p-2.5 leading-normal"
                  >
                    <span className="text-amber-400 font-bold mt-0.5">•</span>
                    <span>{imp}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No registered areas for improvement.</p>
            )}
          </div>

          {/* Error display if any */}
          {analysisError && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-3 text-xs text-red-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Audit Failed</p>
                <p className="text-[10px] leading-normal">{analysisError}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

    </div>
  );
}
