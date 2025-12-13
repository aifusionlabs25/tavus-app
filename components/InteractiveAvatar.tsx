'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CVIProvider } from '@/app/components/cvi/components/cvi-provider';
import { Conversation } from '@/app/components/cvi/components/conversation';

type TavusConversation = {
    conversation_id: string;
    conversation_url: string;
};

const SIDEBAR_WIDTH = 400; // px
const HEADER_HEIGHT = 68;  // px (used for the demo iframe top offset)

function IconArrowRight(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
    );
}

function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}

function IconMail(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    );
}

function IconX(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function ShellBackground() {
    return (
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
            {/* Tech glows */}
            <div className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 h-[780px] w-[780px] rounded-full bg-blue-500/10 blur-[110px]" />
            <div className="absolute left-[-120px] top-[-180px] h-[520px] w-[620px] rounded-full bg-indigo-500/10 blur-[110px]" />
            <div className="absolute right-[-180px] bottom-[-220px] h-[640px] w-[840px] rounded-full bg-emerald-500/10 blur-[130px]" />
            {/* Subtle grid (masked) */}
            <div className="absolute inset-0 gd-grid opacity-[0.45]" />
            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_70%,rgba(0,0,0,0.8)_100%)]" />
        </div>
    );
}

export default function InteractiveAvatar() {
    const [conversation, setConversation] = useState<TavusConversation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioOnly] = useState(false); // kept for API compatibility (toggled elsewhere if you re-add UI)
    const [showDemo, setShowDemo] = useState(false);

    // Lead capture
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        companyName: '',
        message: '',
    });
    const [contactSubmitting, setContactSubmitting] = useState(false);
    const [contactSuccess, setContactSuccess] = useState(false);

    const openCalendly = () => {
        window.open('https://calendly.com/aifusionlabs', '_blank', 'width=600,height=700');
    };

    const startConversation = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/tavus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio_only: audioOnly }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({} as any));
                throw new Error((data as any).error || 'Failed to start conversation');
            }

            const data = (await response.json()) as TavusConversation;
            setConversation(data);
        } catch (err: any) {
            setError(err?.message || 'Something went sideways starting the conversation.');
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

    const handleConversationLeave = useCallback(() => {
        setConversation(null);
        setShowDemo(false);
    }, []);

    const handleStartDemo = async () => {
        if (!conversation) return;

        setShowDemo(true);
        try {
            await fetch('/api/demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: conversation.conversation_id, action: 'start' }),
            });
        } catch (err) {
            console.error('Failed to inject demo context:', err);
        }
    };

    const handleEndDemo = async () => {
        if (!conversation) return;

        setShowDemo(false);
        try {
            await fetch('/api/demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: conversation.conversation_id, action: 'end' }),
            });
        } catch (err) {
            console.error('Failed to end demo context:', err);
        }
    };

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
                }, 1600);
            }
        } catch (err) {
            console.error('Contact form error:', err);
        } finally {
            setContactSubmitting(false);
        }
    };

    // “Zombie killer” — ensure the Tavus conversation is ended on tab close.
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (!conversation?.conversation_id) return;

            fetch('/api/tavus/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: conversation.conversation_id }),
                keepalive: true,
            }).catch(console.error);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [conversation]);

    // Quality-of-life keyboard shortcuts: Esc closes modal; Shift+Esc ends demo; Ctrl+Enter starts convo (idle).
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (e.shiftKey && showDemo) handleEndDemo();
                if (showContactForm) setShowContactForm(false);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !conversation && !loading) {
                startConversation();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [conversation, loading, showDemo, showContactForm]);

    const headerStyle = useMemo(() => {
        // In demo mode we leave room for the Morgan sidebar so the header never hides behind it.
        return showDemo ? { right: `${SIDEBAR_WIDTH}px` } : undefined;
    }, [showDemo]);

    return (
        <CVIProvider>
            <div className="relative h-screen w-full overflow-hidden text-white selection:bg-emerald-500/25">
                <ShellBackground />

                {/* HEADER */}
                <header
                    className={[
                        'fixed left-0 top-0 z-[300] w-full',
                        'px-6 md:px-10',
                        'py-4',
                        showDemo ? 'bg-slate-950/75 backdrop-blur-md border-b border-slate-700/40' : '',
                    ].join(' ')}
                    style={headerStyle}
                >
                    <div className="mx-auto flex max-w-7xl items-center justify-between">
                        {/* Logo (hide during demo, consistent with current behavior) */}
                        {!showDemo ? (
                            <a
                                href="https://godeskless.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 hover:opacity-85 transition-opacity"
                            >
                                <img
                                    src="/godeskless-logo-white-clean.png"
                                    alt="GoDeskless"
                                    className="h-9 w-auto object-contain"
                                />
                            </a>
                        ) : (
                            <div />
                        )}

                        {/* Right-side actions */}
                        <div className="flex items-center gap-3">
                            {!conversation && (
                                <>
                                    <button onClick={openCalendly} className="gd-btn" type="button">
                                        <IconCalendar className="h-4 w-4" />
                                        <span>Schedule Demo</span>
                                    </button>

                                    <button onClick={() => setShowContactForm(true)} className="gd-btn" type="button">
                                        <IconMail className="h-4 w-4" />
                                        <span>Contact Us</span>
                                    </button>
                                </>
                            )}

                            {conversation && !showDemo && (
                                <>
                                    <button onClick={handleStartDemo} className="gd-btn gd-btn-primary" type="button">
                                        <span>Interactive Demo</span>
                                        <IconArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </button>

                                    <button onClick={endConversation} className="gd-btn gd-btn-danger" type="button">
                                        <IconX className="h-5 w-5" />
                                        <span>Exit</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* MAIN */}
                <main className="h-full w-full pt-[72px]">
                    {/* Demo Mode: iframe left + Morgan sidebar right */}
                    {showDemo && (
                        <>
                            <section
                                className="fixed left-0 z-20 overflow-hidden"
                                style={{
                                    top: `${HEADER_HEIGHT}px`,
                                    right: `${SIDEBAR_WIDTH}px`,
                                    bottom: 0,
                                }}
                            >
                                <div className="h-full w-full bg-white">
                                    {/* A little “browser chrome” to feel enterprise, not “random iframe” */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
                                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400" />
                                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                                            <span className="ml-3 text-sm font-semibold">GoDeskless Interactive Demo</span>
                                        </div>
                                        <div className="text-xs text-slate-500">Embedded demo</div>
                                    </div>

                                    {/* Scaled iframe container (keeps your existing 65% zoom behavior) */}
                                    <div
                                        style={{
                                            width: '153.84%', // 100 / 0.65
                                            height: '153.84%',
                                            transform: 'scale(0.65)',
                                            transformOrigin: 'top left',
                                        }}
                                    >
                                        <iframe
                                            src="https://godeskless.com/lp/interactive-demo/"
                                            className="h-full w-full border-0"
                                            title="GoDeskless Interactive Demo"
                                        />
                                    </div>
                                </div>
                            </section>

                            <aside
                                className="fixed right-0 top-0 bottom-0 z-[100] flex w-[400px] flex-col border-l border-slate-700/50 bg-slate-900 shadow-[-20px_0_60px_rgba(0,0,0,0.55)]"
                            >
                                <div className="flex h-[72px] items-center justify-between px-5">
                                    <div className="gd-badge">
                                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-sm font-semibold">Morgan live</span>
                                    </div>

                                    <button onClick={handleEndDemo} className="gd-btn" type="button" title="Back to Morgan">
                                        <span>Back</span>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    {conversation ? (
                                        <Conversation conversationUrl={conversation.conversation_url} onLeave={handleConversationLeave} />
                                    ) : null}
                                </div>

                                <div className="flex gap-3 border-t border-slate-700/50 bg-slate-800/60 p-4">
                                    <button onClick={handleEndDemo} className="gd-btn gd-btn-primary flex-1" type="button">
                                        <span>Back to Morgan</span>
                                    </button>
                                    <button onClick={endConversation} className="gd-btn gd-btn-danger flex-1" type="button">
                                        <span>Exit</span>
                                    </button>
                                </div>
                            </aside>
                        </>
                    )}

                    {/* Not demo mode: show hero or conversation stage */}
                    {!showDemo && (
                        <section className="flex h-[calc(100vh-72px)] w-full items-center justify-center px-6">
                            <div className={conversation ? 'w-full max-w-6xl' : 'w-full max-w-4xl'}>
                                {conversation ? (
                                    <div className="gd-stage">
                                        <div className="bg-slate-900">
                                            <Conversation conversationUrl={conversation.conversation_url} onLeave={handleConversationLeave} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="gd-glass mx-auto flex flex-col items-center justify-center text-center px-10 py-14 md:px-14 md:py-16">
                                        <div className="relative mb-8 gd-float">
                                            <div className="absolute inset-0 rounded-full bg-emerald-500/18 blur-2xl" />
                                            <div className="rounded-full bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 p-2">
                                                <img
                                                    src="/morgan-headshot-circle.png"
                                                    alt="Morgan Headshot"
                                                    className="h-44 w-44 md:h-52 md:w-52 rounded-full object-cover opacity-95"
                                                />
                                            </div>
                                        </div>

                                        <h1 className="text-balance text-4xl md:text-5xl font-light tracking-tight">
                                            Meet <span className="gd-gradient-text font-semibold">Morgan</span>
                                        </h1>
                                        <p className="mt-4 max-w-xl text-lg text-slate-300/90 leading-relaxed">
                                            Your GoDeskless Field Service Specialist.
                                        </p>

                                        <div className="mt-10 flex flex-col items-center gap-3">
                                            <button
                                                onClick={startConversation}
                                                disabled={loading}
                                                className="gd-btn gd-btn-primary px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                type="button"
                                            >
                                                <span>{loading ? 'Connecting…' : 'Start Conversation'}</span>
                                                {!loading && <IconArrowRight className="h-5 w-5" />}
                                            </button>

                                            {error && (
                                                <div className="gd-badge border-red-500/25 bg-red-500/10 text-red-200">
                                                    <span className="h-2 w-2 rounded-full bg-red-400" />
                                                    <span className="text-sm">{error}</span>
                                                </div>
                                            )}
                                        </div>


                                        <p className="mt-10 text-xs text-slate-400/90">
                                            Morgan uses AI to generate responses. Information may be inaccurate or incomplete. Please review and verify.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </main>

                {/* CONTACT MODAL */}
                {showContactForm && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
                        <div className="gd-glass w-full max-w-md p-7 md:p-8">
                            <div className="mb-5 flex items-center justify-between">
                                <h3 className="text-xl font-semibold">Contact Us</h3>
                                <button onClick={() => setShowContactForm(false)} className="gd-btn" type="button" aria-label="Close">
                                    <IconX className="h-5 w-5" />
                                </button>
                            </div>

                            {contactSuccess ? (
                                <div className="gd-badge border-emerald-500/25 bg-emerald-500/10">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                    <span className="text-sm">Message sent. We’ll reach out shortly.</span>
                                </div>
                            ) : (
                                <form onSubmit={handleContactSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <input
                                            className="w-full rounded-xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                                            placeholder="Name"
                                            value={contactForm.name}
                                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                            required
                                        />
                                        <input
                                            className="w-full rounded-xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                                            placeholder="Email"
                                            type="email"
                                            value={contactForm.email}
                                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                            required
                                        />
                                        <input
                                            className="w-full rounded-xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                                            placeholder="Phone (optional)"
                                            value={contactForm.phone}
                                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                        />
                                        <input
                                            className="w-full rounded-xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                                            placeholder="Company"
                                            value={contactForm.companyName}
                                            onChange={(e) => setContactForm({ ...contactForm, companyName: e.target.value, company: e.target.value })}
                                        />
                                        <textarea
                                            className="min-h-[110px] w-full resize-none rounded-xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                                            placeholder="What would you like to discuss?"
                                            value={contactForm.message}
                                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={contactSubmitting}
                                        className="gd-btn gd-btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {contactSubmitting ? 'Sending…' : 'Send message'}
                                    </button>

                                    <p className="text-xs text-slate-400/90">
                                        Tip: Press <span className="gd-badge px-2 py-1 text-xs">Esc</span> to close this dialog.
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </CVIProvider >
    );
}
