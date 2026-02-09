// Simple Login Page for Firebase authentication
import { useState } from 'react'
import { useAuth, ROLES } from '../hooks/useAuth'
import { PrimaryButton } from '../components/ui/shared'
import { AlertCircle, Check } from 'lucide-react'
import { COLORS, LANGUAGES } from '@/lib/constants'

export default function LoginPage() {
    const { signIn, signUp } = useAuth()
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [role, setRole] = useState(ROLES.EDITOR)
    const [selectedLanguages, setSelectedLanguages] = useState(['en']) // Default to English

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isSignUp) {
                await signUp(email, password, {
                    role,
                    languages: role === ROLES.MANAGER ? selectedLanguages : []
                })
            } else {
                await signIn(email, password)
            }
            // Auth context will handle redirect
        } catch (err) {
            console.error('Auth error:', err)
            let errorMessage = 'Authentication failed. Please try again.'

            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                errorMessage = '❌ Invalid email or password.'
            } else if (err.code === 'auth/email-already-in-use') {
                errorMessage = '❌ Email already registered. Please sign in.'
            } else if (err.code === 'auth/weak-password') {
                errorMessage = '❌ Password should be at least 6 characters.'
            } else if (err.message) {
                errorMessage = `Error: ${err.message}`
            }

            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const toggleLanguage = (code) => {
        if (selectedLanguages.includes(code)) {
            setSelectedLanguages(prev => prev.filter(c => c !== code))
        } else {
            setSelectedLanguages(prev => [...prev, code])
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'hsl(220, 14%, 96%)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '440px',
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                {/* Logo/Title */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: '32px'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        boxShadow: '0 4px 12px rgba(255, 0, 132, 0.2)'
                    }}>
                        {/* WordFlow Logo SVG */}
                        <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <ellipse cx="16" cy="8" rx="5" ry="7" fill="white" opacity="0.95" />
                            <ellipse cx="24" cy="16" rx="7" ry="5" fill="white" opacity="0.95" />
                            <ellipse cx="16" cy="24" rx="5" ry="7" fill="white" opacity="0.95" />
                            <ellipse cx="8" cy="16" rx="7" ry="5" fill="white" opacity="0.95" />
                            <circle cx="16" cy="16" r="4" fill="white" />
                        </svg>
                    </div>

                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'hsl(222, 47%, 11%)',
                        marginBottom: '4px',
                        letterSpacing: '-0.02em'
                    }}>
                        WordFlow
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: 'hsl(220, 9%, 46%)',
                        margin: 0
                    }}>
                        {isSignUp ? 'Create your account' : 'Sign in to your account'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl mb-5 text-rose-700 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Fields */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="user@example.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="••••••••"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all text-sm"
                        />
                    </div>

                    {/* Sign Up Exclusive Fields */}
                    {isSignUp && (
                        <div className="space-y-4 pt-2 border-t border-slate-100 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRole(ROLES.EDITOR)}
                                        className={`flex items-center justify-center py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${role === ROLES.EDITOR
                                                ? 'bg-pink-50 border-pink-200 text-pink-700'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        Editor
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole(ROLES.MANAGER)}
                                        className={`flex items-center justify-center py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${role === ROLES.MANAGER
                                                ? 'bg-purple-50 border-purple-200 text-purple-700'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        Manager
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">
                                    {role === ROLES.MANAGER
                                        ? 'Managers can approve translations and manage projects.'
                                        : 'Editors can translate content and submit for review.'
                                    }
                                </p>
                            </div>

                            {/* Language Selection (Manager Only) */}
                            {role === ROLES.MANAGER && (
                                <div className="animate-in fade-in zoom-in-95 duration-200">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Approving Languages</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.values(LANGUAGES).map(lang => {
                                            const isSelected = selectedLanguages.includes(lang.code)
                                            return (
                                                <button
                                                    key={lang.code}
                                                    type="button"
                                                    onClick={() => toggleLanguage(lang.code)}
                                                    className={`
                                                        flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all text-left
                                                        ${isSelected
                                                            ? 'bg-slate-800 border-slate-800 text-white'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                        }
                                                    `}
                                                >
                                                    <span>{lang.label}</span>
                                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {selectedLanguages.length === 0 && (
                                        <p className="text-xs text-amber-600 mt-1.5">
                                            Select at least one language to manage.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <PrimaryButton
                        type="submit"
                        disabled={loading || (isSignUp && role === ROLES.MANAGER && selectedLanguages.length === 0)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '15px',
                            marginTop: '24px'
                        }}
                    >
                        {loading
                            ? (isSignUp ? 'Creating account...' : 'Signing in...')
                            : (isSignUp ? 'Create Account' : 'Sign In')
                        }
                    </PrimaryButton>
                </form>

                {/* Toggle Mode */}
                <div className="mt-8 text-center pt-6 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mb-0">
                        {isSignUp ? "Already have an account?" : "Don't have an account?"}
                    </p>
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm font-semibold text-pink-600 hover:text-pink-700 hover:underline mt-1 focus:outline-none"
                    >
                        {isSignUp ? "Sign in instead" : "Create an account"}
                    </button>
                </div>
            </div>
        </div>
    )
}
