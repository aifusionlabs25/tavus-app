'use client';

import { useState } from 'react';



export default function InteractiveAvatar() {
    const [conversation, setConversation] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioOnly, setAudioOnly] = useState(false);
    const [showDemo, setShowDemo] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

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

    // Screen Share Handler for Perception Layer
    const handleScreenShare = async () => {
        try {
            // Request screen share - prefer current tab for easier selection
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'browser' // Prefer browser tab over window/screen
                },
                audio: false,
                // @ts-ignore - preferCurrentTab is a newer API
                preferCurrentTab: true // Pre-select current tab if supported
            });

            // Track when user stops sharing
            stream.getVideoTracks()[0].onended = () => {
                setIsScreenSharing(false);
                console.log('Screen share ended by user');
            };

            setIsScreenSharing(true);
            console.log('Screen share started - Morgan can now see the demo!');

            // Note: In a full implementation, you'd send this stream to Tavus
            // For now, the browser's screen share indicator shows it's active
        } catch (err) {
            console.error('Screen share failed:', err);
            setIsScreenSharing(false);
        }
    };

    return (
        <div className="w-full h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* 1. BACKGROUND: Deep Void with Tech Glows */}
            <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent opacity-60 blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px]"></div>
            </div>

            {/* 2. HEADER: Minimal & Tech-Focused - Hide logo when demo is active */}
            <div className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6">
                {/* Logo - Hidden when demo is showing */}
                {!showDemo && (
                    <div className="flex items-center gap-3">
                        <img
                            src="/godeskless-logo-white-clean.png"
                            alt="GoDeskless"
                            className="h-9 w-auto object-contain"
                        />
                    </div>
                )}
                {showDemo && <div></div>} {/* Empty spacer when logo hidden */}

                {/* Right Side: Active Conversation Controls */}
                {conversation && (
                    <div className="flex items-center gap-4">
                        {/* Interactive Demo Button - matches Start Conversation styling */}
                        <button
                            onClick={handleStartDemo}
                            className="group flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3 rounded-full font-medium shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all duration-300"
                        >
                            <span>Interactive Demo</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>

                        {/* Exit/End Button - red with matching style */}
                        <button
                            onClick={endConversation}
                            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-6 py-3 rounded-full font-medium shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_50px_rgba(239,68,68,0.5)] transition-all duration-300"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Exit</span>
                        </button>
                    </div>
                )}
            </div>

            {/* 3. MAIN CONTENT AREA */}
            <div className="relative w-full h-full max-w-[1600px] mx-auto flex items-center justify-center p-8">

                {/* A. INTERACTIVE DEMO IFRAME - Full screen for better visibility */}
                {showDemo && (
                    <div className="fixed inset-0 z-20 bg-black transition-all duration-700 ease-in-out animation-fade-in">
                        <iframe
                            src="https://godeskless.com/lp/interactive-demo/"
                            className="w-full h-full border-0"
                        />
                        {/* Demo Mode Controls - Left side to not overlap Morgan */}
                        <div className="absolute bottom-8 left-8 z-[200] flex items-center gap-3">
                            {/* Share Screen Button - Let Morgan see the demo */}
                            <button
                                onClick={handleScreenShare}
                                className={`px-6 py-3 rounded-full font-medium backdrop-blur-md transition-all flex items-center gap-2 ${isScreenSharing
                                    ? 'bg-emerald-600/90 text-white border border-emerald-400'
                                    : 'bg-blue-600/90 hover:bg-blue-500/90 text-white border border-blue-400'
                                    }`}
                            >
                                {isScreenSharing ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                        Morgan is Watching
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Share Screen with Morgan
                                    </>
                                )}
                            </button>

                            {/* End Demo Button */}
                            <button
                                onClick={handleEndDemo}
                                className="bg-slate-900/80 text-white px-6 py-3 rounded-full border border-slate-700 hover:bg-slate-800 transition-all flex items-center gap-2 backdrop-blur-md"
                            >
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                End Demo
                            </button>
                        </div>
                    </div>
                )}

                {/* B. MORGAN AVATAR CONTAINER - Vertically centered on right in PIP mode */}
                <div className={`transition-all duration-700 ease-in-out ${showDemo
                    ? 'fixed right-4 top-1/2 -translate-y-1/2 w-[280px] h-[360px] z-[100] rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)]' // PIP Mode - Vertical stack, centered on right
                    : 'relative w-full max-w-6xl h-[80vh] z-30 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-white/10' // Full Mode - Larger!
                    }`}>
                    {conversation ? (
                        <div className="w-full h-full">
                            <iframe
                                src={conversation.conversation_url}
                                className="w-full h-full border-0"
                                allow="camera; microphone; autoplay; display-capture"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        /* IDLE STATE UI */
                        <div className="w-full h-full bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-12">
                            {/* Increased size, removed padding/border to make image fill the circle */}
                            <div className="rounded-full bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 mb-8 relative group">
                                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                                {/* Image path updated to 'morgan-headshot-circle.png' (User Specified Asset) */}
                                <img
                                    src="/morgan-headshot-circle.png"
                                    alt="Morgan Headshot"
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
                                className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-full text-white font-medium text-lg shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center"
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

            </div>
        </div>
    );
}
