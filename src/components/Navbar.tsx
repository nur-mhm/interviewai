import React from 'react';
import { Brain, Bot, Key, Settings, Briefcase, Sun, Moon } from 'lucide-react';
import { Provider } from '../types';

interface NavbarProps {
  currentProvider: Provider;
  isConfigured: boolean;
  onReset: () => void;
  showSetup: boolean;
  setShowSetup: (show: boolean) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Navbar({
  currentProvider,
  isConfigured,
  onReset,
  showSetup,
  setShowSetup,
  theme,
  onToggleTheme,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#0D0D0D]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition-transform hover:scale-105">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
              Enterprise Mock AI
            </h1>
            <p className="hidden text-xs text-slate-400 sm:block">
              Multi-AI Professional Interview Simulator
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            id="theme-toggle-btn"
            className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-800 bg-[#161616] text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to High-Contrast Light Theme'}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4 text-slate-500 hover:text-indigo-400" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400 animate-pulse" />
            )}
          </button>

          {isConfigured && (
            <>
              <button
                onClick={() => setShowSetup(!showSetup)}
                id="toggle-setup-btn"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  showSetup
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'bg-[#161616] text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{showSetup ? 'Show Interview' : 'Configure Settings'}</span>
                <span className="sm:hidden">Settings</span>
              </button>

              <button
                onClick={onReset}
                id="reset-interview-btn"
                className="rounded-lg border border-red-900 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/60 cursor-pointer"
              >
                Restart Fresh
              </button>
            </>
          )}

          {/* Active Provider Tag */}
          <div className="flex items-center gap-1.5 rounded-full bg-[#161616] border border-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
            <Bot className="h-3.5 w-3.5 text-slate-400" />
            <span className="capitalize">{currentProvider === 'gemini' ? 'Google Gemini' : 'OpenAI GPT-4'}</span>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex h-2 w-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
