'use client';

import { useState } from 'react';



export default function InteractiveAvatar() {
    const [conversation, setConversation] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioOnly, setAudioOnly] = useState(false);
    const [showDemo, setShowDemo] = useState(false);

    const startConversation = async () => {
        const activePersonaId = process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID;

        if (!activePersonaId) {
            setError('Please enter a Persona ID or configure it in environment variables');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/tavus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    persona_id: activePersonaId,
                    audio_only: audioOnly,
                    // v18.8: Tags will be handled by backend defaults for now
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to start conversation');
            }

            const data = await response.json();
            setConversation(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const endConversation = async () => {
        if (!conversation) return;

        try {
            await fetch('/api/tavus/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: conversation.conversation_id }),
            });
        } catch (err) {
            console.error('Failed to end conversation gracefully:', err);
        } finally {
            setConversation(null);
            setShowDemo(false);
        }
    };

    // v18.8: Interactive Demo Handlers (Context Injection)
    const handleStartDemo = async () => {
        if (!conversation) return;

        // 1. Update UI immediately for responsiveness
        setShowDemo(true);

        // 2. Tell Backend to Inject "Demo Mode" Context
        try {
            await fetch('/api/demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversation_id: conversation.conversation_id,
                    action: 'start'
                }),
            });
        } catch (err) {
            console.error('Failed to start demo context:', err);
        }
    };

    const handleEndDemo = async () => {
        if (!conversation) return;

        // 1. Update UI immediately
        setShowDemo(false);

        // 2. Tell Backend to Inject "Welcome Back" Context
        try {
            await fetch('/api/demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversation_id: conversation.conversation_id,
                    action: 'end'
                }),
            });
        } catch (err) {
            console.error('Failed to end demo context:', err);
        }
    };

    return (
        <div className="w-full h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* 1. BACKGROUND: Deep Void with Tech Glows */}
            <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent opacity-60 blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px]"></div>
            </div>

            {/* 2. HEADER: Minimal & Tech-Focused */}
            <div className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6">
                <div className="flex items-center gap-3">
                    <span className="text-white text-2xl font-light tracking-widest">
                        Morgan <span className="text-slate-500 mx-2">|</span> <span className="text-emerald-400 font-medium">GoDeskless</span>
                    </span>
                </div>
            </div>

            {/* 3. MAIN CONTENT AREA */}
            <div className="relative w-full h-full max-w-[1600px] mx-auto flex items-center justify-center p-8">

                {/* A. INTERACTIVE DEMO IFRAME (Appears behind/beside Morgan) */}
                {showDemo && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 transition-all duration-700 ease-in-out animation-fade-in">
                        <iframe
                            src="https://app.godeskless.com"
                            className="w-full h-full border-0 rounded-lg shadow-2xl opacity-100"
                        />
                        {/* "Back to Morgan" Button */}
                        <button
                            onClick={handleEndDemo}
                            className="absolute bottom-8 right-8 z-50 bg-slate-900/80 text-white px-6 py-3 rounded-full border border-slate-700 hover:bg-slate-800 transition-all flex items-center gap-2 backdrop-blur-md"
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            End Demo
                        </button>
                    </div>
                )}

                {/* B. MORGAN AVATAR CONTAINER */}
                <div className={`relative transition-all duration-700 ease-in-out ${showDemo
                    ? 'w-[320px] h-[180px] absolute bottom-8 right-8 z-40 rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' // PIP Mode
                    : 'w-full max-w-4xl aspect-video z-30 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-white/10' // Full Mode
                    }`}>
                    {conversation ? (
                        <div className="w-full h-full">
                            {/* @ts-ignore */}
                            <tavus-broadcast-view
                                conversation-id={conversation.conversation_id}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        /* IDLE STATE UI */
                        <div className="w-full h-full bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-12">
                            {/* Increased size, removed padding/border to make image fill the circle */}
                            <div className="rounded-full bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 mb-8 relative group">
                                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                                {/* Image path updated to 'morgan-ii-thumbnail.png' (New Asset) */}
                                <img
                                    src="/morgan-ii-thumbnail.png"
                                    alt="Morgan II"
                                    className="w-60 h-60 object-cover rounded-full relative z-10 opacity-90 group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>

                            <h2 className="text-4xl md:text-5xl font-light text-white mb-6 tracking-tight">
                                Meet <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Morgan</span>
                            </h2>

                            <p className="text-lg text-slate-400 max-w-lg leading-relaxed mb-10">
                                Your GoDeskless Field Service Specialist.
                            </p>

                            <button
                                onClick={startConversation}
                                disabled={loading}
                                className="group relative px-10 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-full text-white font-medium text-xl shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center"
                            >
                                <span className="relative z-10 flex items-center gap-3 justify-center">
                                    {loading ? 'Connecting...' : 'Start Conversation'}
                                    {!loading && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
                                </span>
                            </button>

                            {error && (
                                <div className="mt-6 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* DEMO TRIGGER (Hidden/Auto or visible for testing?) - Currently Morgan triggers it via context, but we can keep a manual button if needed. 
                    For now, the UI relies on 'showDemo' state which is toggled via the demo functions. 
                    If we need a manual trigger for the USER to test: 
                */}
                {conversation && !showDemo && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4">
                        <button
                            onClick={handleStartDemo}
                            className="bg-slate-800/80 hover:bg-slate-700/80 text-white/50 hover:text-white px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm border border-white/5 transition-all"
                        >
                            [DEV] Trigger Demo
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
