'use client';

import { useState } from 'react';

export default function InteractiveAvatar() {
    const [conversation, setConversation] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const startConversation = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/tavus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}), // no persona_id sent from client
            });

            if (!response.ok) throw new Error((await response.json()).error);
            const data = await response.json();
            setConversation(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const scrollToDemo = () => {
        const demoSection = document.getElementById('demo-shell');
        if (demoSection) {
            demoSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className={`w-full transition-all duration-700 ${conversation ? 'fixed inset-0 z-50 bg-black' : ''}`}>

            {/* Active Conversation Overlay */}
            {conversation && (
                <div className="absolute inset-0 z-50 flex flex-col">
                    {/* HUD Header */}
                    <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-green-500 font-mono text-xs tracking-widest uppercase">Live Feed Active</span>
                        </div>
                        <button
                            onClick={() => setConversation(null)}
                            className="px-6 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-full text-xs uppercase tracking-widest transition-all backdrop-blur-sm"
                        >
                            Terminate Session
                        </button>
                    </div>

                    {/* The Iframe */}
                    <div className="relative w-full h-full bg-black">
                        <iframe
                            src={conversation.conversation_url}
                            className="absolute inset-0 w-full h-full border-0"
                            allow="microphone; camera; autoplay"
                            title="AI Fusion Labs Conversation"
                        />

                        {/* Caption */}
                        <div className="absolute bottom-8 left-0 w-full text-center pointer-events-none z-20">
                            <p className="text-white/30 text-xs font-mono tracking-widest uppercase">
                                Powered by Tavus · Prototype session for GoDeskless
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Idle State: 2-Column Hero Grid */}
            {!conversation && (
                <div className="max-w-6xl mx-auto px-6 md:px-10 grid md:grid-cols-2 gap-12 items-center w-full min-h-[60vh]">

                    {/* Left Column: Copy & Actions */}
                    <div className="space-y-6 text-left z-10">
                        {/* Eyebrow */}
                        <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
                            GoDeskless + X Agents · Prototype: Morgan
                        </p>

                        {/* Headline */}
                        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Meet Morgan, the AI Field Service Guide for GoDeskless
                        </h1>

                        {/* Subhead */}
                        <p className="text-base md:text-lg text-slate-300 max-w-xl leading-relaxed">
                            Agent X (Morgan) helps qualify prospects, surface pain points, and guide a tailored GoDeskless demo—using your discovery framework, but in a natural conversation.
                        </p>

                        {/* Buttons */}
                        <div className="flex flex-wrap gap-4 pt-4">
                            <button
                                onClick={startConversation}
                                disabled={loading}
                                className="px-6 py-3 rounded-full text-sm md:text-base font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:shadow-[0_0_30px_rgba(52,211,153,0.6)] transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                        Initializing...
                                    </>
                                ) : (
                                    'Talk to Morgan'
                                )}
                            </button>

                            <button
                                onClick={scrollToDemo}
                                className="px-6 py-3 rounded-full text-sm md:text-base font-semibold border border-emerald-400 text-emerald-400 hover:bg-emerald-900/20 transition-all"
                            >
                                Start Guided Demo
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="text-red-400 text-sm font-mono bg-red-950/30 px-4 py-2 border border-red-500/20 rounded inline-block mt-4">
                                Error: {error}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Holographic Portal */}
                    <div className="flex justify-center lg:justify-end relative">
                        <div className="relative group">
                            {/* Soft Glow Behind */}
                            <div className="absolute inset-[-40px] rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />

                            {/* Rotating Rings */}
                            <div className="absolute inset-0 rounded-full border border-emerald-500/20 w-80 h-80 animate-[spin_10s_linear_infinite]" />
                            <div className="absolute inset-[-20px] rounded-full border border-cyan-500/10 w-[360px] h-[360px] animate-[spin_15s_linear_infinite_reverse]" />

                            {/* Avatar Container */}
                            <div className="relative w-80 h-80 rounded-full overflow-hidden border-4 border-emerald-500/10 shadow-[0_0_50px_rgba(52,211,153,0.2)] group-hover:shadow-[0_0_80px_rgba(52,211,153,0.4)] transition-all duration-500">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/40 z-10" />
                                <img
                                    src="/morgan-icon.png"
                                    alt="Morgan"
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
