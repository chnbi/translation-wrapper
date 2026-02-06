// Simple Login Page for PocketBase authentication
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { PrimaryButton } from '../components/ui/shared'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
    const { signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await signIn(email, password)
            // Auth context will handle redirect
        } catch (err) {
            console.error('Login error:', err)

            // Provide more helpful error messages
            let errorMessage = 'Login failed. Please try again.'

            if (err.status === 400) {
                errorMessage = '❌ Invalid email or password. Check your credentials and try again.'
            } else if (err.status === 403) {
                errorMessage = '❌ Account disabled. Please contact support.'
            } else if (err.message) {
                errorMessage = err.message
            }

            setError(errorMessage)
        } finally {
            setLoading(false)
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
                maxWidth: '400px',
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
                    {/* WordFlow Logo */}
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #FF0084 0%, #FF4D9C 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        boxShadow: '0 4px 12px rgba(255, 0, 132, 0.2)'
                    }}>
                        {/* Flower/Petal Logo */}
                        <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Top petal */}
                            <ellipse cx="16" cy="8" rx="5" ry="7" fill="white" opacity="0.95" />
                            {/* Right petal */}
                            <ellipse cx="24" cy="16" rx="7" ry="5" fill="white" opacity="0.95" />
                            {/* Bottom petal */}
                            <ellipse cx="16" cy="24" rx="5" ry="7" fill="white" opacity="0.95" />
                            {/* Left petal */}
                            <ellipse cx="8" cy="16" rx="7" ry="5" fill="white" opacity="0.95" />
                            {/* Center circle */}
                            <circle cx="16" cy="16" r="4" fill="white" />
                        </svg>
                    </div>

                    {/* Brand Name */}
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
                        Sign in to your account
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        backgroundColor: 'hsl(0, 84%, 97%)',
                        border: '1px solid hsl(0, 84%, 85%)',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        color: 'hsl(0, 84%, 40%)',
                        fontSize: '14px'
                    }}>
                        <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'hsl(222, 47%, 11%)',
                            marginBottom: '8px'
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="manager@test.com"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                fontSize: '14px',
                                border: '1px solid hsl(220, 13%, 91%)',
                                borderRadius: '12px',
                                outline: 'none',
                                transition: 'border-color 0.15s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'hsl(340, 82%, 59%)'}
                            onBlur={(e) => e.target.style.borderColor = 'hsl(220, 13%, 91%)'}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'hsl(222, 47%, 11%)',
                            marginBottom: '8px'
                        }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                fontSize: '14px',
                                border: '1px solid hsl(220, 13%, 91%)',
                                borderRadius: '12px',
                                outline: 'none',
                                transition: 'border-color 0.15s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'hsl(340, 82%, 59%)'}
                            onBlur={(e) => e.target.style.borderColor = 'hsl(220, 13%, 91%)'}
                        />
                    </div>

                    {/* Submit Button */}
                    <PrimaryButton
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '15px'
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </PrimaryButton>
                </form>

                {/* Test Accounts Info - ONLY IN DEV */}
                {import.meta.env.DEV && (
                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        backgroundColor: 'hsl(220, 14%, 98%)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: 'hsl(220, 9%, 46%)'
                    }}>
                        <p style={{ fontWeight: 600, marginBottom: '12px', color: 'hsl(222, 47%, 11%)' }}>
                            Test Accounts (DEV ONLY):
                        </p>

                        {/* Manager Account with Autofill */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                        }}>
                            <div>
                                <p style={{ marginBottom: '2px' }}>
                                    <strong>Manager:</strong> manager@test.com
                                </p>
                                <p style={{ fontSize: '11px', opacity: 0.7 }}>password123</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('manager@test.com')
                                    setPassword('password123')
                                }}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'linear-gradient(135deg, #FF0084 0%, #FF4D9C 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                    boxShadow: '0 2px 4px rgba(255, 0, 132, 0.2)'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-1px)'
                                    e.target.style.boxShadow = '0 4px 8px rgba(255, 0, 132, 0.3)'
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)'
                                    e.target.style.boxShadow = '0 2px 4px rgba(255, 0, 132, 0.2)'
                                }}
                            >
                                Autofill
                            </button>
                        </div>

                        {/* Editor Account with Autofill */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <p style={{ marginBottom: '2px' }}>
                                    <strong>Editor:</strong> editor@test.com
                                </p>
                                <p style={{ fontSize: '11px', opacity: 0.7 }}>password123</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('editor@test.com')
                                    setPassword('password123')
                                }}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'linear-gradient(135deg, #FF0084 0%, #FF4D9C 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                    boxShadow: '0 2px 4px rgba(255, 0, 132, 0.2)'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-1px)'
                                    e.target.style.boxShadow = '0 4px 8px rgba(255, 0, 132, 0.3)'
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)'
                                    e.target.style.boxShadow = '0 2px 4px rgba(255, 0, 132, 0.2)'
                                }}
                            >
                                Autofill
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
