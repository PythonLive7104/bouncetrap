import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

function EmailVerificationBanner({ user, setUser }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  if (!user || user.email_verified) return null

  async function handleResend() {
    setSending(true)
    try {
      await api.post('/auth/resend-verification/')
      setSent(true)
    } catch {}
    finally { setSending(false) }
  }

  return (
    <div className="mx-4 md:mx-8 mt-6 px-5 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
      <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-amber-300 font-semibold text-sm">Verify your email to use credits</p>
        <p className="text-amber-400/70 text-xs mt-0.5">
          We sent a verification link to <span className="text-amber-300 font-medium">{user.email}</span>.
          Check your inbox (and spam folder).
        </p>
      </div>
      <button
        onClick={handleResend}
        disabled={sending || sent}
        className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/15 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {sending ? 'Sending…' : sent ? 'Sent ✓' : 'Resend email'}
      </button>
    </div>
  )
}

const NAV = [
  {
    to: '/dashboard',
    label: 'Overview',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/dashboard/verify',
    label: 'Verify Email',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/bulk',
    label: 'Bulk Jobs',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    to: '/dashboard/deliverability',
    label: 'Deliverability',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/header-analyzer',
    label: 'Header Analyzer',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    to: '/dashboard/email-finder',
    label: 'Email Finder',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/smtp-testing',
    label: 'SMTP Testing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    to: '/dashboard/domain-reputation',
    label: 'Domain Reputation',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/ai-advisor',
    label: 'AI Advisor',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/inbox-placement',
    label: 'Inbox Placement',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
      </svg>
    ),
  },
  {
    to: '/dashboard/teams',
    label: 'Teams',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/referral',
    label: 'Referrals',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/api-keys',
    label: 'API Keys',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/billing',
    label: 'Billing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const PAGE_TITLE = {
  '/dashboard':                  'Overview',
  '/dashboard/verify':           'Verify Email',
  '/dashboard/bulk':             'Bulk Jobs',
  '/dashboard/deliverability':   'Deliverability',
  '/dashboard/header-analyzer':  'Header Analyzer',
  '/dashboard/email-finder':     'Email Finder',
  '/dashboard/smtp-testing':      'SMTP Testing',
  '/dashboard/domain-reputation': 'Domain Reputation',
  '/dashboard/ai-advisor':        'AI Advisor',
  '/dashboard/inbox-placement':  'Inbox Placement',
  '/dashboard/teams':            'Teams',
  '/dashboard/referral':         'Referrals',
  '/dashboard/api-keys':         'API Keys',
  '/dashboard/billing':          'Billing',
  '/dashboard/settings':         'Settings',
}

function SidebarContent({ user, credits, onNavClick, onLogout }) {
  const isFree    = (user?.plan || 'free') === 'free'
  const planLimit = 100  // free trial baseline for the progress bar
  const barPct    = isFree ? Math.min((credits / planLimit) * 100, 100) : 100

  return (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-white/6 shrink-0">
        <NavLink to="/" className="flex items-center gap-2.5 font-bold text-lg text-white">
          <img src="/favicon.svg" alt="BounceTrap" className="w-7 h-7" />
          BounceTrap
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Credits pill */}
      <div className="mx-3 mb-3 px-4 py-3 rounded-xl bg-brand-950/60 border border-brand-800/40 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400 font-medium">Credits</span>
          <span className="text-xs text-brand-300 font-semibold">{credits.toLocaleString()}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/8">
          <div
            className="h-1.5 rounded-full bg-brand-500 transition-all"
            style={{ width: `${barPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-1.5">
          {isFree ? `of ${planLimit} free credits` : 'available · never expire'}
        </p>
      </div>

      {/* User footer */}
      <div className="border-t border-white/6 px-3 py-3 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, credits, logout, setUser, setCredits } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const pageTitle = PAGE_TITLE[location.pathname] || 'Dashboard'

  // Pull the latest credits + plan from the server on every dashboard load and
  // on navigation, so an approved crypto deposit (credited server-side by an
  // admin) reflects without the user having to log out / switch browsers.
  useEffect(() => {
    let cancelled = false
    api.get('/billing/credits/')
      .then(({ data }) => {
        if (cancelled) return
        if (typeof data.credits === 'number') setCredits(data.credits)
        if (data.plan) {
          setUser((prev) => (prev ? { ...prev, plan: data.plan, credits: data.credits } : prev))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [location.pathname, setCredits, setUser])

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] font-sans flex">

      {/* ── Mobile overlay backdrop ───────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — desktop: always visible, mobile: drawer ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-[#0a0a14] border-r border-white/6 flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:w-60
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent
          user={user}
          credits={credits}
          onNavClick={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top bar */}
        <header className="h-16 border-b border-white/6 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden text-slate-400 hover:text-white transition-colors p-1"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-white font-semibold text-base">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/verify')}
              className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-3 md:px-4 py-2 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">+ Verify email</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>
        </header>

        <EmailVerificationBanner user={user} setUser={setUser} />
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
