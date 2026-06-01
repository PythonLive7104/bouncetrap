import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const { user, setUser } = useAuthStore()
  const [state, setState] = useState('verifying') // verifying | success | error | already

  useEffect(() => {
    const uid   = searchParams.get('uid')
    const token = searchParams.get('token')

    if (!uid || !token) {
      setState('error')
      return
    }

    api.post('/auth/verify-email/', { uid, token })
      .then(({ data }) => {
        if (data.detail?.includes('already')) {
          setState('already')
        } else {
          setState('success')
          // Update the in-memory user so the dashboard banner disappears immediately
          if (user) setUser({ ...user, email_verified: true })
        }
      })
      .catch(() => setState('error'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg text-white mb-10">
          <img src="/favicon.svg" alt="BounceTrap" className="w-7 h-7" />
          BounceTrap
        </Link>

        {state === 'verifying' && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-8 py-10">
            <svg className="animate-spin w-10 h-10 text-brand-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-white font-semibold text-lg">Verifying your email…</p>
          </div>
        )}

        {state === 'success' && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-8 py-10">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-white font-bold text-xl mb-2">Email verified!</h1>
            <p className="text-slate-400 text-sm mb-6">Your account is now active. You can start using your free credits.</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
        )}

        {state === 'already' && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-8 py-10">
            <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-white font-bold text-xl mb-2">Already verified</h1>
            <p className="text-slate-400 text-sm mb-6">Your email address has already been confirmed.</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/8 px-8 py-10">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-white font-bold text-xl mb-2">Verification failed</h1>
            <p className="text-slate-400 text-sm mb-6">
              This link is invalid or has expired. Request a new one from your dashboard.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
