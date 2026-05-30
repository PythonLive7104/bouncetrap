import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

function SubscriptionBanner({ active, expiresAt, plan }) {
  if (!plan || plan === 'free') return null

  const now     = new Date()
  const expiry  = expiresAt ? new Date(expiresAt) : null
  const daysLeft = expiry ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : null

  if (!active || (expiry && expiry <= now)) {
    return (
      <div className="mx-8 mt-6 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
        <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-red-300 font-semibold text-sm">Subscription expired</p>
          <p className="text-red-400/70 text-xs mt-0.5">
            Your credits are preserved and will be unlocked when you renew.{' '}
            <NavLink to="/dashboard/billing" className="underline text-red-300 hover:text-red-200">Renew now</NavLink>
          </p>
        </div>
      </div>
    )
  }

  if (daysLeft !== null && daysLeft <= 7) {
    return (
      <div className="mx-8 mt-6 px-5 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 font-semibold text-sm">Subscription expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</p>
          <p className="text-amber-400/70 text-xs mt-0.5">
            Renew before {expiry.toLocaleDateString()} to keep uninterrupted access.{' '}
            <NavLink to="/dashboard/billing" className="underline text-amber-300 hover:text-amber-200">Renew now</NavLink>
          </p>
        </div>
      </div>
    )
  }

  return null
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
  '/dashboard/inbox-placement':  'Inbox Placement',
  '/dashboard/teams':            'Teams',
  '/dashboard/referral':         'Referrals',
  '/dashboard/api-keys':         'API Keys',
  '/dashboard/billing':          'Billing',
  '/dashboard/settings':         'Settings',
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, credits, logout, setAuth, subscriptionActive, subscriptionExpiresAt } = useAuthStore()

  const pageTitle = PAGE_TITLE[location.pathname] || 'Dashboard'

  // Profile is synced by the overview's dashboard summary call.
  // Only re-fetch when navigating away from and back to the overview.

  function handleLogout() {
    logout()
    navigate('/')
  }

  const planLimit = { free: 100, starter: 25000, growth: 100000, pro: 200000 }[user?.plan] || 100

  return (
    <div className="min-h-screen bg-[#0a0a14] font-sans flex">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="w-60 shrink-0 border-r border-white/6 flex flex-col">
        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-white/6">
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
        <div className="mx-3 mb-3 px-4 py-3 rounded-xl bg-brand-950/60 border border-brand-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400 font-medium">Credits</span>
            <span className="text-xs text-brand-300 font-semibold">{credits.toLocaleString()}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/8">
            <div
              className="h-1.5 rounded-full bg-brand-500 transition-all"
              style={{ width: `${Math.min((credits / planLimit) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-1.5">of {planLimit.toLocaleString()} total</p>
        </div>

        {/* User footer */}
        <div className="border-t border-white/6 px-3 py-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top bar */}
        <header className="h-16 border-b border-white/6 flex items-center justify-between px-8">
          <div>
            <h1 className="text-white font-semibold text-base">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/verify')}
              className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Verify email
            </button>
          </div>
        </header>

        <SubscriptionBanner
          active={subscriptionActive}
          expiresAt={subscriptionExpiresAt}
          plan={user?.plan}
        />
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
