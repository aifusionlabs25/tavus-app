'use client';

import { useState } from 'react';

export default function InteractiveAvatar() {
    const [conversation, setConversation] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioOnly, setAudioOnly] = useState(false);

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
                    audio_only: audioOnly
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
            // Call our backend to gracefully end the conversation on Tavus
            // This ensures the webhook triggers immediately
            await fetch('/api/tavus/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: conversation.conversation_id }),
            });
        } catch (err) {
            console.error('Failed to end conversation gracefully:', err);
        } finally {
            setConversation(null);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Active Conversation Overlay */}
            {conversation && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black">
                    <div className="absolute top-4 right-4 z-50 flex gap-4">
                        <a
                            href="https://calendly.com/aifusionlabs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 transition-colors shadow-lg font-bold flex items-center"
                        >
                            Schedule a Demo
                        </a>
                        <button
                            onClick={endConversation}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-lg font-bold"
                        >
                            End Conversation
                        </button>
                    </div>
                    <div className="relative w-full h-full">
                        <iframe
                            src={`${conversation.conversation_url}${conversation.conversation_url.includes('?') ? '&' : '?'}daily_config={"showLeaveButton":false,"showFullscreenButton":false,"showParticipantsBar":false,"showLocalVideo":false}`}
                            className="absolute inset-0 w-full h-full border-0"
                            allow="microphone; camera; autoplay"
                            title="AI Fusion Labs Conversation"
                        />
                    </div>
                </div>
            )}

            {/* Idle State: Simple Test Harness Card */}
            {!conversation && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-2xl text-center">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-indigo-400 mb-2">X Agents / Morgan for GoDeskless</h2>
                    </div>

                    <div className="space-y-6">
                        {error && (
                            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-900/50">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={startConversation}
                            disabled={loading}
                            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-md shadow-lg transform transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                        >
                            {loading ? 'Connect with Morgan' : 'Start Demo with Morgan'}
                        </button>

                        <a
                            href="https://calendly.com/aifusionlabs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md shadow-lg text-center transform transition-all hover:-translate-y-0.5"
                        >
                            Schedule a Demo
                        </a>

                        {/* Audio Only Toggle */}
                        <div className="flex items-center justify-center gap-2">
                            <input
                                type="checkbox"
                                id="audioOnly"
                                checked={audioOnly}
                                onChange={(e) => setAudioOnly(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                            />
                            <label htmlFor="audioOnly" className="text-sm text-slate-400 cursor-pointer select-none">
                                Voice Only Mode
                            </label>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
