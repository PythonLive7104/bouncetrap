import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

export default function GitHubCallbackPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const called   = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code  = new URLSearchParams(window.location.search).get('code')
    const error = new URLSearchParams(window.location.search).get('error')

    if (error || !code) {
      navigate('/login?error=github_denied', { replace: true })
      return
    }

    api.post('/auth/social/github/', { code })
      .then(({ data }) => {
        setAuth(data.user, data.access)
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        navigate('/login?error=github_failed', { replace: true })
      })
  }, [navigate, setAuth])

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-400 text-sm">Completing GitHub sign-in…</p>
      </div>
    </div>
  )
}
