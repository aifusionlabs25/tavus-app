'use client'
import { useState, useEffect } from 'react'

interface AccessGateProps {
    children: React.ReactNode
}

export default function AccessGate({ children }: AccessGateProps) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [name, setName] = useState('')
    const [token, setToken] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Check if already authenticated on mount
    useEffect(() => {
        const auth = localStorage.getItem('morgan-auth')
        if (auth) {
            try {
                const parsed = JSON.parse(auth)
                if (parsed.authenticated && parsed.expiresAt > Date.now()) {
                    setIsAuthenticated(true)
                } else {
                    localStorage.removeItem('morgan-auth')
                    setIsAuthenticated(false)
                }
            } catch {
                setIsAuthenticated(false)
            }
        } else {
            setIsAuthenticated(false)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, token })
            })

            const data = await response.json()

            if (data.success) {
                // Store auth with 24-hour expiry
                localStorage.setItem('morgan-auth', JSON.stringify({
                    authenticated: true,
                    name: name,
                    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
                }))
                setIsAuthenticated(true)
            } else {
                setError(data.message || 'Invalid access token')
            }
        } catch {
            setError('Authentication failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('morgan-auth')
        setIsAuthenticated(false)
        setName('')
        setToken('')
    }

    // Still checking auth status
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-white/50">Loading...</div>
            </div>
        )
    }

    // Not authenticated - show login
    if (!isAuthenticated) {
        return (
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
                            Enter your credentials to continue
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
                                    Access Token
                                </label>
                                <input
                                    type="password"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="Enter secret token"
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
                                disabled={loading || !name || !token}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg shadow-lg shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Access Demo'}
                            </button>
                        </div>
                    </form>

                    <p className="text-center text-slate-500 text-xs mt-6">
                        Need access? Contact your administrator.
                    </p>
                </div>
            </div>
        )
    }

    // Authenticated - show children with logout option
    return (
        <div className="relative">
            {/* Logout button - small, in corner */}
            <button
                onClick={handleLogout}
                className="fixed bottom-4 left-4 z-[500] text-xs text-slate-500 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700/50 transition-all"
            >
                Sign Out
            </button>
            {children}
        </div>
    )
}
