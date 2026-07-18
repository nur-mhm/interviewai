import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SetupPanel from './components/SetupPanel';
import ChatPanel from './components/ChatPanel';
import { Message, SetupData, Provider } from './types';
import { AlertCircle, Bot, Brain, RefreshCw, X } from 'lucide-react';

const LOCAL_STORAGE_KEY_SETUP = 'mock_interview_setup_v1';
const LOCAL_STORAGE_KEY_MESSAGES = 'mock_interview_messages_v1';

const defaultSetupData: SetupData = {
  resumeText: '',
  fileName: '',
  jobContext: {
    company: '',
    role: ''
  },
  provider: 'gemini',
  geminiKey: '',
  openaiKey: '',
  mode: 'coach'
};

export default function App() {
  const [setupData, setSetupData] = useState<SetupData>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SETUP);
    return saved ? JSON.parse(saved) : defaultSetupData;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_MESSAGES);
    return saved ? JSON.parse(saved) : [];
  });

  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SETUP);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    return !!(parsed.resumeText && parsed.jobContext.company && parsed.jobContext.role);
  });

  const [showSetup, setShowSetup] = useState<boolean>(!isConfigured);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string>('');

  // Persist setup data
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_SETUP, JSON.stringify(setupData));
  }, [setupData]);

  // Persist messages
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  // Automatically start the interview by asking the first question
  const initiateFirstQuestion = async (activeSetup: SetupData) => {
    setIsLoading(true);
    setErrorBanner('');
    
    // We send an empty array or a simple start flag message. Here we send an introductory trigger.
    // The system prompt handles generating the welcome + first question.
    const startText = activeSetup.mode === 'coach'
      ? `Hi! Please welcome me as my Interview Preparation Helper & Coach for the ${activeSetup.jobContext.role} role at ${activeSetup.jobContext.company}. Suggest 3-4 key areas we can work on based on my resume, and ask your first question or suggest a starting point!`
      : 'Hi, I am ready for the mock interview. Please welcome me and start the assessment.';

    const initialPromptMessage = [
      {
        id: 'init-trigger',
        role: 'user',
        content: startText,
        timestamp: new Date().toISOString()
      }
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: initialPromptMessage,
          provider: activeSetup.provider,
          geminiKey: activeSetup.geminiKey,
          openaiKey: activeSetup.openaiKey,
          resume: activeSetup.resumeText,
          jobContext: activeSetup.jobContext,
          mode: activeSetup.mode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start interview.');
      }

      const interviewerResponse: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toISOString()
      };

      setMessages([interviewerResponse]);
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'An error occurred while connecting to the AI provider. Check your keys or network connectivity.');
      // Turn setup tab back on to fix configuration
      setShowSetup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = async (data: SetupData) => {
    setSetupData(data);
    setIsConfigured(true);
    setShowSetup(false);

    // If there is no existing message thread, or if resume text / context changed dramatically, trigger initial question
    if (messages.length === 0) {
      await initiateFirstQuestion(data);
    }
  };

  const handleSendMessage = async (text: string) => {
    setErrorBanner('');
    const userMessage: Message = {
      id: `candidate-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Clean messages for the backend proxy API
      const apiMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          provider: setupData.provider,
          geminiKey: setupData.geminiKey,
          openaiKey: setupData.openaiKey,
          resume: setupData.resumeText,
          jobContext: setupData.jobContext,
          mode: setupData.mode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retrieve AI feedback.');
      }

      const interviewerResponse: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, interviewerResponse]);
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Connection lost or API error received from AI recruiter proxy.');
    } finally {
      setIsLoading(false);
    }
  };

  // Allow switching modes on the fly
  const handleToggleMode = async (newMode: 'coach' | 'mock') => {
    const updatedSetup = { ...setupData, mode: newMode };
    setSetupData(updatedSetup);
    
    // Send a message notifying the assistant that the user has toggled the active mode
    const modeNotification = newMode === 'coach'
      ? "SYSTEM NOTE: Switching to Prep Helper & Coach mode. I am ready to ask you questions, practice, and learn."
      : "SYSTEM NOTE: Switching to Mock Interview simulator mode. Please begin/continue testing my skills in a structured turn-by-turn simulation.";
      
    await handleSendMessage(modeNotification);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to restart the interview session? This will fully reset your chat history.')) {
      setMessages([]);
      setIsConfigured(false);
      setShowSetup(true);
      setErrorBanner('');
      localStorage.removeItem(LOCAL_STORAGE_KEY_MESSAGES);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col font-sans text-slate-200" id="app-root-container">
      {/* Navbar section */}
      <Navbar
        currentProvider={setupData.provider}
        isConfigured={isConfigured}
        onReset={handleReset}
        showSetup={showSetup}
        setShowSetup={setShowSetup}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col justify-center">
        
        {/* API Error Notification Banners */}
        {errorBanner && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl bg-red-950/20 border border-red-900/60 p-4 text-sm text-red-400 shadow-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Simulated Recruiter Connection Error</p>
                <p className="mt-0.5 text-xs text-red-400 leading-relaxed">{errorBanner}</p>
              </div>
            </div>
            <button 
              onClick={() => setErrorBanner('')}
              className="text-red-400 hover:text-red-200 hover:bg-red-950/40 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* View Toggle Router */}
        {showSetup ? (
          <SetupPanel
            initialData={setupData}
            onComplete={handleSetupComplete}
          />
        ) : (
          <ChatPanel
            setupData={setupData}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onGoBack={() => setShowSetup(true)}
            onToggleMode={handleToggleMode}
          />
        )}
      </main>
    </div>
  );
}
