import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || ''
const GITHUB_REDIRECT  = `${window.location.origin}/auth/github/callback`

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function RegisterPage() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const setAuth       = useAuthStore((s) => s.setAuth)
  const refCode       = params.get('ref') || ''

  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', referral_code: refCode })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  function handleGoogle() {
    const p = new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      redirect_uri:  `${window.location.origin}/auth/google/callback`,
      response_type: 'token',
      scope:         'email profile',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${p}`
  }

  function handleGitHub() {
    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT)}`
    window.location.href = url
  }

  function validate() {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (!form.confirm_password) e.confirm_password = 'Please confirm your password'
    else if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setServerError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register/', {
        full_name:        form.full_name,
        email:            form.email,
        password:         form.password,
        confirm_password: form.confirm_password,
        referral_code:    form.referral_code || undefined,
      })
      setAuth(data.user, data.access)
      navigate('/dashboard')
    } catch (err) {
      if (!err.response) {
        setServerError('Cannot reach the server. Please try again in a moment.')
      } else {
        const d = err.response.data
        if (d && typeof d === 'object') {
          const fieldErr = {}
          Object.entries(d).forEach(([k, v]) => {
            fieldErr[k] = Array.isArray(v) ? v[0] : v
          })
          if (Object.keys(fieldErr).length) setErrors(fieldErr)
          else setServerError(d.detail || 'Registration failed. Please try again.')
        } else {
          setServerError('Registration failed. Please try again.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function field(name, label, type = 'text', placeholder = '', autoComplete = '') {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
        <input
          type={type}
          autoComplete={autoComplete || name}
          value={form[name]}
          onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border ${
            errors[name] ? 'border-red-500/60' : 'border-white/10'
          } text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors`}
        />
        {errors[name] && <p className="mt-1.5 text-xs text-red-400">{errors[name]}</p>}
      </div>
    )
  }

  return (
    <>
    <Helmet>
      <title>Create Account — BounceTrap</title>
      <meta name="description" content="Sign up for BounceTrap and get 100 free email verification credits. No credit card required." />
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4 py-12 font-sans">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 text-xl font-bold text-white">
            <img src="/favicon.svg" alt="BounceTrap" className="w-9 h-9" />
            BounceTrap
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-400">Start verifying emails for free — no credit card required</p>
        </div>

        <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white text-sm font-medium transition-colors mb-3"
          >
            <GoogleIcon />
            Sign up with Google
          </button>

          <button
            type="button"
            onClick={handleGitHub}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white text-sm font-medium transition-colors mb-6"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
            </svg>
            Sign up with GitHub
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/8" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-slate-500 bg-[#0e0e1c]">or sign up with email</span>
            </div>
          </div>

          {serverError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {field('full_name', 'Full name', 'text', 'Jane Smith', 'name')}
            {field('email', 'Email address', 'email', 'you@company.com', 'email')}
            {field('password', 'Password', 'password', '8+ characters', 'new-password')}
            {field('confirm_password', 'Confirm password', 'password', 'Repeat password', 'new-password')}

            <p className="text-xs text-slate-500 !mt-3">
              By creating an account you agree to our{' '}
              <a href="#" className="text-brand-400 hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-brand-400 hover:underline">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-900/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
    </>
  )
}
