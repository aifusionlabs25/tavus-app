'use client';

import { useState, useCallback } from 'react';
import { CVIProvider } from '@/app/components/cvi/components/cvi-provider';
import { Conversation } from '@/app/components/cvi/components/conversation';

export default function InteractiveAvatar() {
    const [conversation, setConversation] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioOnly, setAudioOnly] = useState(false);
    const [showDemo, setShowDemo] = useState(false);

    // Lead Capture Form State
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', company: '', companyName: '', message: '' });
    const [contactSubmitting, setContactSubmitting] = useState(false);
    const [contactSuccess, setContactSuccess] = useState(false);

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
            console.error('Failed to inject demo context:', err);
        }
    };

    const handleEndDemo = async () => {
        setShowDemo(false);

        // Tell Morgan the demo has ended
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

    const handleConversationLeave = useCallback(() => {
        setConversation(null);
        setShowDemo(false);
    }, []);

    // Lead Capture Form Submit
    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setContactSubmitting(true);
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactForm),
            });
            if (response.ok) {
                setContactSuccess(true);
                setTimeout(() => {
                    setShowContactForm(false);
                    setContactSuccess(false);
                    setContactForm({ name: '', email: '', phone: '', company: '', companyName: '', message: '' });
                }, 2000);
            }
        } catch (err) {
            console.error('Contact form error:', err);
        } finally {
            setContactSubmitting(false);
        }
    };

    // Calendly - opens popup
    const openCalendly = () => {
        window.open('https://calendly.com/aifusionlabs', '_blank', 'width=600,height=700');
    };

    return (
        <CVIProvider>
            <div className="w-full h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500/30">
                {/* 1. BACKGROUND: Deep Void with Tech Glows */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[100px]"></div>
                    <div className="absolute top-0 left-0 w-[600px] h-[400px] bg-indigo-900/10 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px]"></div>
                </div>

                {/* 2. HEADER: Minimal & Tech-Focused */}
                <div className={`absolute top-0 left-0 w-full z-[300] flex items-center justify-between px-8 py-4 ${showDemo ? 'bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50' : ''}`} style={showDemo ? { right: '420px', width: 'auto' } : {}}>
                    {/* Logo - Hidden when demo is showing */}
                    {!showDemo && (
                        <a href="https://godeskless.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <img
                                src="/godeskless-logo-white-clean.png"
                                alt="GoDeskless"
                                className="h-9 w-auto object-contain"
                            />
                        </a>
                    )}
                    {showDemo && <div></div>} {/* Empty spacer when logo hidden */}

                    {/* Right Side Controls */}
                    <div className="flex items-center gap-4">
                        {/* When NO conversation - show Schedule Demo & Contact buttons */}
                        {!conversation && (
                            <>
                                <button
                                    onClick={openCalendly}
                                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full font-medium border border-white/20 transition-all duration-300"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>Schedule Demo</span>
                                </button>
                                <button
                                    onClick={() => setShowContactForm(true)}
                                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full font-medium border border-white/20 transition-all duration-300"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>Contact Us</span>
                                </button>
                            </>
                        )}

                        {/* When IN conversation and NOT in demo - show Demo & Exit in header */}
                        {conversation && !showDemo && (
                            <>
                                {/* Interactive Demo Button */}
                                <button
                                    onClick={handleStartDemo}
                                    className="group flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3 rounded-full font-medium shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all duration-300"
                                >
                                    <span>Interactive Demo</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>

                                {/* Exit/End Conversation Button */}
                                <button
                                    onClick={endConversation}
                                    className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-6 py-3 rounded-full font-medium shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_50px_rgba(239,68,68,0.5)] transition-all duration-300"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Exit</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* 3. MAIN CONTENT AREA */}
                <div className="relative w-full h-full flex items-center justify-center">

                    {/* A. INTERACTIVE DEMO IFRAME - Takes left portion, leaving room for Morgan sidebar */}
                    {showDemo && (
                        <div className="fixed inset-0 z-20 bg-black transition-all duration-700 ease-in-out" style={{ right: '500px', top: '60px' }}>
                            <iframe
                                src="https://godeskless.com/lp/interactive-demo/"
                                className="w-full h-full border-0"
                            />
                        </div>
                    )}

                    {/* B. MORGAN AVATAR CONTAINER - Vertical sidebar when in demo mode */}
                    <div className={`transition-all duration-700 ease-in-out ${showDemo
                        ? 'fixed right-0 top-0 bottom-0 w-[500px] z-[100] bg-slate-900 border-l border-slate-700/50 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] flex flex-col'
                        : 'relative w-full max-w-6xl h-[80vh] z-30 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-white/10'
                        }`}>

                        {conversation ? (
                            <div className="flex-1 bg-slate-900 overflow-hidden flex flex-col">
                                {/* Official Tavus CVI Conversation Component */}
                                <div className="flex-1 overflow-hidden">
                                    <Conversation
                                        conversationUrl={conversation.conversation_url}
                                        onLeave={handleConversationLeave}
                                    />
                                </div>

                                {/* Demo mode controls - at bottom of sidebar */}
                                {showDemo && (
                                    <div className="p-4 border-t border-slate-700/50 bg-slate-800/80 flex gap-3">
                                        <button
                                            onClick={handleEndDemo}
                                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg font-medium transition-all duration-300"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                            </svg>
                                            <span>Back to Morgan</span>
                                        </button>
                                        <button
                                            onClick={endConversation}
                                            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-medium transition-all duration-300"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            <span>Exit</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* IDLE STATE UI */
                            <div className="w-full h-full bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-12">
                                {/* Avatar Image */}
                                <div className="rounded-full bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 mb-8 relative group">
                                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
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

            {/* CONTACT FORM MODAL */}
            {showContactForm && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-semibold text-white">Contact Us</h3>
                            <button
                                onClick={() => setShowContactForm(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {contactSuccess ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-xl text-white">Thank you!</p>
                                <p className="text-slate-400 mt-2">We'll be in touch soon.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleContactSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={contactForm.name}
                                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                        placeholder="your@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={contactForm.phone}
                                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Company</label>
                                    <input
                                        type="text"
                                        value={contactForm.company}
                                        onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                        placeholder="Company name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Your Role</label>
                                    <input
                                        type="text"
                                        value={contactForm.companyName}
                                        onChange={(e) => setContactForm({ ...contactForm, companyName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                        placeholder="Your title/role"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Message</label>
                                    <textarea
                                        value={contactForm.message}
                                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                                        placeholder="How can we help?"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={contactSubmitting}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg transition-all duration-300 disabled:opacity-50"
                                >
                                    {contactSubmitting ? 'Sending...' : 'Send Message'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </CVIProvider>
    );
}
