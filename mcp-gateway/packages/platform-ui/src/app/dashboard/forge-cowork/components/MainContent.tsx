'use client';

/**
 * FORGE-Cowork Main Content Area
 * Chat interface with session restoration
 */

import { Pause, RefreshCw, Paperclip, Send, Sparkles } from 'lucide-react';

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-100 rounded h-1.5 overflow-hidden">
      <div
        className="h-full bg-teal-600 rounded transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function MainContent() {
  return (
    <main className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Project Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-teal-600">
            forge-platform-ui
          </span>
          <span className="text-slate-200">|</span>
          <span className="text-sm font-semibold text-slate-900">
            Epic 10b: Platform UI Features
          </span>
          <span className="text-slate-200">•</span>
          <span className="text-[13px] text-slate-500">Phase 2 of 3</span>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-gray-200 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">
            <Pause className="w-4 h-4" />
            Pause
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-gray-200 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Run Tests
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto px-8 py-6 flex flex-col items-start">
        <div className="w-full max-w-[900px]">
          {/* User Message */}
          <div className="flex justify-end mb-5">
            <div className="bg-teal-600 text-white px-4 py-3 rounded-2xl rounded-br-sm max-w-[70%] text-sm leading-relaxed">
              Continue working on Epic 10b - Platform UI Features
            </div>
          </div>

          {/* AI Response Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden w-full">
            {/* Session Restored Header */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-teal-700">Session Restored</span>
              <span className="ml-auto text-xs text-slate-500">2 hours ago</span>
            </div>

            <div className="p-5">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-slate-50 rounded-[10px] p-3.5">
                  <div className="text-xs text-slate-500 mb-1">Completed</div>
                  <div className="text-[15px] font-semibold text-green-500">
                    3 tasks
                  </div>
                </div>
                <div className="bg-teal-50 rounded-[10px] p-3.5 border border-teal-200">
                  <div className="text-xs text-slate-500 mb-1">In Progress</div>
                  <div className="text-[15px] font-semibold text-teal-600">
                    Task 10b.2.1
                  </div>
                </div>
                <div className="bg-slate-50 rounded-[10px] p-3.5">
                  <div className="text-xs text-slate-500 mb-1">Remaining</div>
                  <div className="text-[15px] font-semibold text-slate-500">
                    4 tasks
                  </div>
                </div>
              </div>

              {/* Current Task */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-teal-600 text-white text-[11px] font-semibold px-2 py-1 rounded-md">
                      CURRENT
                    </span>
                    <span className="font-semibold text-slate-900">
                      10b.2.1 - WebSocket Integration
                    </span>
                  </div>
                  <span className="text-xl font-bold text-teal-600">53%</span>
                </div>
                <ProgressBar progress={53} />
              </div>

              {/* Action Prompt */}
              <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-3.5 flex items-center justify-between">
                <span className="text-amber-800 text-sm">
                  Should I proceed with this implementation?
                </span>
                <div className="flex gap-2">
                  <button className="px-3.5 py-2 bg-teal-600 text-white rounded-lg text-[13px] font-medium hover:bg-teal-700 transition-colors">
                    Yes, continue
                  </button>
                  <button className="px-3.5 py-2 bg-white text-slate-700 border border-gray-200 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">
                    Let me review
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-slate-50 px-8 py-4 flex justify-start">
        <div className="w-full max-w-[900px] flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 border border-slate-200 shadow-sm">
          <button className="text-slate-500 hover:text-slate-700 transition-colors p-1">
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            placeholder="Message FORGE..."
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-slate-900 placeholder:text-slate-400"
          />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">⌘ Enter</span>
            <button className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white hover:bg-teal-700 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
