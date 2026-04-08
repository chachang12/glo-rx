import { authClient } from '@/lib/auth-client'
import { useSearchParams } from 'react-router'
import { useState } from 'react'

export const LoginForm = () => {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/app/dashboard'
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = () => {
    setError(null)
    setLoading(true)
    const clientOrigin = window.location.origin

    authClient.signIn.social({
      provider: 'google',
      callbackURL: `${clientOrigin}${redirectTo}`,
    }).catch((err: Error) => {
      console.error('Sign-in error:', err)
      setError(err.message ?? 'Failed to start sign-in. Is the server running?')
      setLoading(false)
    })
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#4f8ef7] to-[#7c3aed] bg-clip-text text-transparent">
          Axeous
        </h1>
        <p className="text-sm text-[#888]">
          Sign in to continue
        </p>
      </div>

      {/* Sign in card */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-8 space-y-6">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        {error && (
          <div className="rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5 px-4 py-3">
            <p className="text-xs text-[#ef4444] text-center">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#555]">More options soon</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <div className="space-y-2">
          <button
            disabled
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.01] text-sm text-[#555] cursor-not-allowed"
          >
            <GithubIcon />
            Continue with GitHub
          </button>
          <button
            disabled
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.01] text-sm text-[#555] cursor-not-allowed"
          >
            <EmailIcon />
            Continue with email
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-[#555] leading-relaxed">
        By signing in, you agree to use this platform
        <br />
        for educational purposes.
      </p>
    </div>
  )
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
  </svg>
)

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#555">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
  </svg>
)

const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)
