import React from 'react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {/* Background Grid */}
      <div className="fixed inset-0 gd-grid -z-10 opacity-40 pointer-events-none" />
      
      <div className="max-w-xl w-full gd-glass p-12 md:p-16 gd-stage">
        <div className="gd-float inline-flex items-center justify-center w-20 h-20 mb-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-10 h-10" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.67 2.67 0 1113.5 17.25l-5.83-5.83m0 0a2.67 2.67 0 10-3.75-3.75 2.67 2.67 0 003.75 3.75z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9l-2.485 2.485m0 0L8.25 16.5m5.015-5.015l2.485-2.485m-2.485 2.485l2.485 2.485m-2.485-2.485l-2.485-2.485" />
          </svg>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight gd-gradient-text">
          System Optimization in Progress
        </h1>
        
        <p className="text-lg text-slate-400 mb-10 leading-relaxed text-balance">
          We&apos;re currently performing some high-performance updates to enhance your experience. 
          Please check back shortly as we refine our workspace for you.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="gd-badge">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Estimated Uptime: Sub-1 hour
          </div>
        </div>
      </div>
      
      <p className="mt-12 text-sm text-slate-500 font-medium tracking-widest uppercase opacity-50">
        AI Fusion Labs &bull; GoDeskless Morgan
      </p>
    </div>
  );
}
