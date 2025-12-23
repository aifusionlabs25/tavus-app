'use client'
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface AccessGateProps {
    children: React.ReactNode
}

export default function AccessGate({ children }: AccessGateProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [token, setToken] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Request Access Modal State
    const [isRequestOpen, setIsRequestOpen] = useState(false)
    const [reqName, setReqName] = useState('')
    const [reqCompany, setReqCompany] = useState('')
    const [reqWebsite, setReqWebsite] = useState('')
    const [reqPhone, setReqPhone] = useState('')
    const [reqEmail, setReqEmail] = useState('')
    const [reqLoading, setReqLoading] = useState(false)
    const [reqSuccess, setReqSuccess] = useState(false)
    const [reqError, setReqError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, token })
            })

            const data = await response.json()

            if (data.success) {
                // strict auth: no localStorage persistence
                setIsAuthenticated(true)
            } else {
                setError(data.message || 'Invalid credentials')
            }
        } catch {
            setError('Authentication failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setReqLoading(true)
        setReqError('')

        try {
            const response = await fetch('/api/request-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: reqName,
                    company: reqCompany,
                    website: reqWebsite,
                    phone: reqPhone,
                    email: reqEmail
                })
            })

            if (response.ok) {
                setReqSuccess(true)
            } else {
                const data = await response.json()
                setReqError(data.error || 'Failed to submit')
            }
        } catch {
            setReqError('Failed to send request. Try again.')
        } finally {
            setReqLoading(false)
        }
    }

    const handleLogout = () => {
        setIsAuthenticated(false)
        setName('')
        setEmail('')
        setToken('')
    }

    // SSR Safe Portal
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    // Authenticated - show children with logout option
    if (isAuthenticated) {
        // Inject user props into children (InteractiveAvatar)
        const childrenWithProps = React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                    //@ts-ignore - Dynamic prop injection
                    userEmail: email,
                    //@ts-ignore
                    userName: name
                });
            }
            return child;
        });

        return (
            <div className="relative">
                {/* Logout button - small, in corner */}
                <button
                    onClick={handleLogout}
                    className="fixed bottom-4 left-4 z-[500] text-[10px] text-slate-600 hover:text-white bg-transparent hover:bg-slate-900/80 px-2 py-1 rounded-md border border-transparent hover:border-slate-700/50 transition-all opacity-30 hover:opacity-100"
                >
                    Exit Demo
                </button>
                {childrenWithProps}
            </div>
        )
    }

    // Not authenticated - show login
    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <img
                            src="/godeskless-logo-white-clean.png"
                            alt="GoDeskless"
                            className="h-12 mx-auto mb-4"
                        />
                        <h1 className="text-2xl font-light text-white">
                            Morgan AI <span className="text-emerald-400">Demo Access</span>
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm">
                            Enter your verified credentials
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Work Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Access Code
                                </label>
                                <input
                                    type="password"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="Enter access code"
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !name || !email || !token}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Secure Access'}
                            </button>
                        </div>
                    </form>

                    <p className="text-center text-slate-500 text-xs mt-6">
                        Need access? <button onClick={() => setIsRequestOpen(true)} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">Click here</button>
                    </p>
                </div>
            </div>

            {/* Request Access Modal */}
            {mounted && isRequestOpen && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
                        {/* Close Button */}
                        <button
                            onClick={() => setIsRequestOpen(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h2 className="text-2xl font-light text-white mb-2">Request Access</h2>
                        <p className="text-slate-400 text-sm mb-6">Enter your details and we'll send you an access code.</p>

                        {reqSuccess ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl text-white mb-2">Request Sent!</h3>
                                <p className="text-slate-400 text-sm">We'll review your info and email you shortly.</p>
                                <button
                                    onClick={() => setIsRequestOpen(false)}
                                    className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRequestSubmit} className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Full Name *"
                                        value={reqName}
                                        onChange={e => setReqName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Company Name"
                                        value={reqCompany}
                                        onChange={e => setReqCompany(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Company Website"
                                        value={reqWebsite}
                                        onChange={e => setReqWebsite(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="tel"
                                        placeholder="Phone"
                                        value={reqPhone}
                                        onChange={e => setReqPhone(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email *"
                                        value={reqEmail}
                                        onChange={e => setReqEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    />
                                </div>

                                {reqError && <p className="text-red-400 text-sm">{reqError}</p>}

                                <button
                                    type="submit"
                                    disabled={reqLoading}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                                >
                                    {reqLoading ? 'Sending...' : 'Send Request'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
