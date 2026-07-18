import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Bot, Cpu, Building, Briefcase, FileText, UploadCloud, 
  CheckCircle, AlertCircle, RefreshCw, Key, ChevronRight, Eye, EyeOff, Sparkles, GraduationCap
} from 'lucide-react';
import { Provider, SetupData, AppMode } from '../types';
import { DEMO_PROFILES, DemoProfile } from '../data/demoProfiles';

interface SetupPanelProps {
  onComplete: (data: SetupData) => void;
  initialData: SetupData;
}

export default function SetupPanel({ onComplete, initialData }: SetupPanelProps) {
  const [provider, setProvider] = useState<Provider>(initialData.provider);
  const [geminiKey, setGeminiKey] = useState(initialData.geminiKey);
  const [openaiKey, setOpenaiKey] = useState(initialData.openaiKey);
  const [company, setCompany] = useState(initialData.jobContext.company);
  const [role, setRole] = useState(initialData.jobContext.role);
  const [mode, setMode] = useState<AppMode>(initialData.mode || 'coach');
  
  // PDF Parsing States
  const [resumeText, setResumeText] = useState(initialData.resumeText);
  const [fileName, setFileName] = useState(initialData.fileName || '');
  const [inputMethod, setInputMethod] = useState<'upload' | 'paste'>(
    initialData.fileName === 'Pasted Resume' || (initialData.resumeText && !initialData.fileName) ? 'paste' : 'upload'
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [previewExtracted, setPreviewExtracted] = useState(false);

  // Toggle API Key visibility
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a valid PDF file.');
      return;
    }
    
    setUploadError('');
    setIsUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse PDF.');
      }

      setResumeText(data.text);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Error occurred while parsing the PDF resume.');
      setFileName('');
      setResumeText('');
    } finally {
      setIsUploading(false);
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSelectDemoProfile = (profile: DemoProfile, autoStart: boolean) => {
    setCompany(profile.company);
    setRole(profile.role);
    setResumeText(profile.resumeText);
    setFileName(profile.fileName);
    setInputMethod('paste');
    setUploadError('');

    if (autoStart) {
      onComplete({
        resumeText: profile.resumeText,
        fileName: profile.fileName,
        jobContext: {
          company: profile.company,
          role: profile.role
        },
        provider,
        geminiKey,
        openaiKey,
        mode: mode
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText) {
      setUploadError('You must upload and parse a resume PDF to continue.');
      return;
    }
    if (!company.trim() || !role.trim()) {
      return;
    }

    onComplete({
      resumeText,
      fileName,
      jobContext: {
        company: company.trim(),
        role: role.trim()
      },
      provider,
      geminiKey,
      openaiKey,
      mode: mode
    });
  };

  const canSubmit = resumeText && company.trim() && role.trim() && !isUploading;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12" id="setup-panel-container">
      {/* Intro Sidebar Section */}
      <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl bg-[#0D0D0D] border border-slate-800 p-6 text-white shadow-xl lg:p-8">
        <div className="space-y-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-emerald-400 border border-slate-800">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/25">
              Active Simulation
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white lg:text-3xl">
              Mock Interview Simulator
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Bridge your qualifications and prospective jobs using state-of-the-art Generative AI. Prepare behaviorally and technically under tailored scenarios designed by world-class recruiter prompts.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              How it works
            </h3>
            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-850 text-[10px] font-bold text-slate-400 border border-slate-800">1</span>
                <span>Select between high-reasoning Gemini-3.5 or GPT-4 providers.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-850 text-[10px] font-bold text-slate-400 border border-slate-800">2</span>
                <span>Provide a PDF Resume; we extract text fully locally.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-850 text-[10px] font-bold text-slate-400 border border-slate-800">3</span>
                <span>Enter details of your target position and ideal firm.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-850 text-[10px] font-bold text-slate-400 border border-slate-800">4</span>
                <span>Receive simulated turn-by-turn professional questions accompanied by actionable, real-time critique hints.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800 text-[11px] text-slate-500 leading-normal">
          <p>
            Your API Keys are strictly kept inside your browser state for real-time proxies. They are never logged or stored on external servers permanently.
          </p>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSubmit} className="lg:col-span-8 bg-[#0D0D0D] p-6 rounded-2xl border border-slate-800 shadow-sm space-y-6 lg:p-8">
        
        {/* 1-Step Setup & Quick Start */}
        <div className="bg-gradient-to-r from-indigo-950/30 via-[#12121c]/45 to-slate-900/30 rounded-xl border border-indigo-500/20 p-5 space-y-4 shadow-inner" id="one-step-setup-container">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/25 uppercase tracking-wider">
              ⚡ 1-Step Instant Setup
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Quick Start with Demo Profiles
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Don't have a PDF resume ready? Click <strong className="text-indigo-400">Quick Start</strong> on any role below to launch the AI interview simulation instantly, or <strong className="text-slate-300">Pre-fill Profile</strong> to inspect and edit the details first.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {DEMO_PROFILES.map((profile) => (
              <div 
                key={profile.id}
                className="group relative flex flex-col justify-between rounded-xl bg-[#121212]/80 hover:bg-[#161616]/90 border border-slate-800 hover:border-indigo-500/30 p-4 text-left transition-all duration-300 shadow-sm"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {profile.title}
                  </h4>
                  <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                    {profile.company}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {profile.role}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectDemoProfile(profile, false)}
                    className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Pre-fill Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectDemoProfile(profile, true)}
                    className="inline-flex items-center gap-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 text-[10px] font-bold shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    Quick Start 🚀
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 1: Provider selection & keys */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">1</span>
            AI Engine Configuration
          </h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="provider-select" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                AI Service Provider
              </label>
              <select
                id="provider-select"
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="w-full rounded-lg border border-slate-800 bg-[#161616] px-3.5 py-2.5 text-sm text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="gemini" className="bg-[#161616]">Google Gemini (Gemini 3.5 Flash)</option>
                <option value="openai" className="bg-[#161616]">OpenAI ChatGPT (GPT-4o)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'} 
                <span className="text-[9px] font-normal text-slate-500 ml-1 lowercase">(optional server key fallback)</span>
              </label>
              <div className="relative">
                <input
                  type={provider === 'gemini' ? (showGeminiKey ? 'text' : 'password') : (showOpenaiKey ? 'text' : 'password')}
                  placeholder={provider === 'gemini' ? "AI Studio GEMINI_API_KEY" : "sk-..."}
                  value={provider === 'gemini' ? geminiKey : openaiKey}
                  onChange={(e) => provider === 'gemini' ? setGeminiKey(e.target.value) : setOpenaiKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-[#161616] px-3.5 py-2.5 pl-9 pr-10 text-sm text-slate-100 placeholder-slate-600 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <Key className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <button
                  type="button"
                  onClick={() => provider === 'gemini' ? setShowGeminiKey(!showGeminiKey) : setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 focus:outline-none"
                >
                  {provider === 'gemini' ? (
                    showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />
                  ) : (
                    showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
            {provider === 'gemini' 
              ? "If you leave this empty, the system will use the environment's pre-configured Gemini key from Google AI Studio Secrets automatically."
              : "An OpenAI API Key is required if no OPENAI_API_KEY is configured on the backend server."}
          </p>
        </div>

        {/* Section 2: Resume Data */}
        <div className="pt-5 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">2</span>
              Resume Data Input
            </h3>
            
            <div className="flex rounded-lg bg-[#111] p-0.5 border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setInputMethod('upload')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  inputMethod === 'upload'
                    ? 'bg-[#1a1a1a] text-white border border-slate-700/50 shadow-xs'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                Upload PDF
              </button>
              <button
                type="button"
                onClick={() => setInputMethod('paste')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  inputMethod === 'paste'
                    ? 'bg-[#1a1a1a] text-white border border-slate-700/50 shadow-xs'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                Paste Text
              </button>
            </div>
          </div>

          {inputMethod === 'upload' ? (
            <div
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-950/20' 
                  : resumeText && fileName !== 'Pasted Resume'
                    ? 'border-emerald-800/60 bg-emerald-950/10' 
                    : 'border-slate-800 hover:border-slate-700 bg-[#111]'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="resume-file-input"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                className="hidden"
              />

              {isUploading ? (
                <div className="py-4 space-y-3 flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Processing Document...</p>
                    <p className="text-xs text-slate-500 mt-1">Extracting plain text layout structures from PDF resume.</p>
                  </div>
                </div>
              ) : (resumeText && fileName !== 'Pasted Resume') ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <CheckCircle className="h-6 w-6" />
                    <span className="text-sm font-semibold">Resume Parsed Successfully</span>
                  </div>
                  
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-[#161616] border border-slate-800 px-3 py-1 text-xs text-slate-300 shadow-xs">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-medium max-w-[200px] truncate">{fileName}</span>
                    <span className="text-slate-700">|</span>
                    <span className="font-mono text-[10px] text-slate-400">{resumeText.split(/\s+/).length} words</span>
                  </div>

                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={triggerFileSelect}
                      className="text-xs font-medium text-slate-400 underline hover:text-white cursor-pointer"
                    >
                      Upload different file
                    </button>
                    <span className="text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setPreviewExtracted(!previewExtracted)}
                      className="text-xs font-medium text-slate-400 underline hover:text-white cursor-pointer"
                    >
                      {previewExtracted ? 'Hide preview' : 'View parsed text'}
                    </button>
                  </div>

                  {previewExtracted && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-left mt-3 max-h-40 overflow-y-auto rounded-lg bg-[#161616] p-3 border border-slate-800 text-xs font-mono text-slate-400 whitespace-pre-wrap leading-relaxed"
                    >
                      {resumeText}
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">
                      <button
                        type="button"
                        onClick={triggerFileSelect}
                        className="font-semibold text-white hover:underline cursor-pointer"
                      >
                        Click to upload
                      </button>{' '}
                      or drag and drop your PDF resume
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Accepts PDF format up to 10MB</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  setFileName(e.target.value ? 'Pasted Resume' : '');
                }}
                rows={6}
                placeholder="Paste the text from your resume, CV, or LinkedIn profile here..."
                className="w-full rounded-xl border border-slate-800 bg-[#111] p-4 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all leading-relaxed font-sans"
              />
              <p className="text-[11px] text-slate-500 leading-normal">
                Pasting plain text bypasses PDF parsing and feeds your candidate profile context directly into the simulation.
              </p>
            </div>
          )}

          {uploadError && (
            <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-red-950/20 p-3 border border-red-900 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Section 3: Target context */}
        <div className="pt-5 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">3</span>
            Target Professional Context
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="company-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Target Company
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="company-input"
                  placeholder="e.g. Google, Stripe, Microsoft, or a fast-paced Startup"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-800 bg-[#161616] px-3.5 py-2.5 pl-9 text-sm text-slate-100 placeholder-slate-600 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <Building className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div>
              <label htmlFor="role-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Job Role & Ideal Candidate Description
              </label>
              <div className="relative">
                <textarea
                  id="role-input"
                  rows={3}
                  placeholder="e.g. Staff Fullstack Engineer - React & Node.js. Focus on scaling real-time WebSocket systems and high-traffic GraphQL APIs."
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-800 bg-[#161616] px-3.5 py-2.5 pl-9 text-sm text-slate-100 placeholder-slate-600 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <Briefcase className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500 leading-normal">
                Detailing specific systems, tools, or behavioral profiles ensures the simulation questions address actual company filters.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Choose Mode */}
        <div className="pt-5 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">4</span>
            Select Learning & Practice Mode
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mode 1: Interview Prep Coach */}
            <button
              type="button"
              onClick={() => setMode('coach')}
              className={`group flex flex-col text-left p-5 rounded-xl border transition-all cursor-pointer ${
                mode === 'coach'
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-sm'
                  : 'border-slate-800 bg-[#121212]/50 hover:border-slate-700 hover:bg-[#161616]/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${mode === 'coach' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'}`}>
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Interview Prep Helper & Coach</h4>
                  <span className="inline-block mt-0.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400 border border-indigo-500/20">Recommended Prep Focus</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3.5 leading-relaxed">
                The AI acts as an interactive helper and mentor. Learn how to structure answers, ask "How should I say this?", request sample/STAR responses, and explore company expectations.
              </p>
            </button>

            {/* Mode 2: Strict Mock Interview */}
            <button
              type="button"
              onClick={() => setMode('mock')}
              className={`group flex flex-col text-left p-5 rounded-xl border transition-all cursor-pointer ${
                mode === 'mock'
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-sm'
                  : 'border-slate-800 bg-[#121212]/50 hover:border-slate-700 hover:bg-[#161616]/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${mode === 'mock' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'}`}>
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Mock Interview Simulator</h4>
                  <span className="inline-block mt-0.5 rounded-full bg-slate-850 px-2 py-0.5 text-[9px] font-bold text-slate-400 border border-slate-800">Strict Evaluation</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3.5 leading-relaxed">
                Simulates a live professional interview. The AI behaves as a formal recruiter, asks one question at a time, evaluates responses, and provides constructive feedback tips in brackets.
              </p>
            </button>
          </div>
        </div>

        {/* Submit action */}
        <div className="pt-5 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            id="start-session-btn"
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-xs transition-all cursor-pointer ${
              canSubmit 
                ? 'bg-white text-black hover:bg-slate-200 active:scale-[0.98]' 
                : 'bg-slate-850 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {mode === 'coach' ? 'Launch Preparation Coach 🚀' : 'Start Mock Interview 🎭'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </form>
    </div>
  );
}
