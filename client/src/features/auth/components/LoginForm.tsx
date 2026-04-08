import { authClient } from '@/lib/auth-client'
import { useSearchParams } from 'react-router'
import { useState } from 'react'

export const LoginForm = () => {
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/app/dashboard'
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = () => {
    setError(null)
    const clientOrigin = window.location.origin

    authClient.signIn.social({
      provider: 'google',
      callbackURL: `${clientOrigin}${redirectTo}`,
    }).catch((err: Error) => {
      console.error('Sign-in error:', err)
      setError(err.message ?? 'Failed to start sign-in. Is the server running?')
    })
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Logo / Brand */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#4f8ef7]">
          Axeous
        </h1>
        <p className="text-[#888] text-sm">
          Sign in to access your practice tests
        </p>
      </div>

      {/* Sign in card */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
        <p className="text-sm font-semibold text-[#bbb]">Continue with</p>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-[#1e1e2e] bg-[#13131f] text-sm font-semibold text-[#ddd] hover:border-[#4f8ef7]/40 hover:bg-[#4f8ef7]/5 transition-all duration-150"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        {error && (
          <p className="text-xs text-[#ef4444] text-center">{error}</p>
        )}
      </div>

      <p className="text-center text-xs text-[#555]">
        By signing in, you agree to use this platform for educational purposes.
      </p>
    </div>
  )
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      fill="#EA4335"
    />
  </svg>
)
