import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

export default function GoogleCallbackPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState('')

  useEffect(() => {
    // Google implicit flow returns access_token in the URL hash fragment
    const hash   = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const token  = params.get('access_token')

    if (!token) {
      setError('Google sign-in failed — no token received.')
      setTimeout(() => navigate('/login'), 2500)
      return
    }

    api.post('/auth/social/google/', { credential: token })
      .then(({ data }) => {
        setAuth(data.user, data.access)
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        setError('Google sign-in failed. Please try again.')
        setTimeout(() => navigate('/login'), 2500)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
      {error ? (
        <div className="text-center px-4">
          <p className="text-red-400 font-medium mb-2">{error}</p>
          <p className="text-slate-500 text-sm">Redirecting to login…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-10 h-10 text-brand-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400 text-sm">Signing in with Google…</p>
        </div>
      )}
    </div>
  )
}
