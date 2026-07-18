import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent = false, loading = false, iconTo }) {
  const iconClasses = `w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-brand-800/60 text-brand-300' : 'bg-white/[0.06] text-slate-400'}`
  return (
    <div className={`p-5 rounded-2xl border ${accent ? 'bg-brand-950/50 border-brand-800/40' : 'bg-white/[0.03] border-white/7'}`}>
      <div className="flex items-start justify-between mb-3">
        {iconTo ? (
          <Link to={iconTo} className={`${iconClasses} hover:text-white hover:bg-white/[0.12] transition-colors`} title="Go to Bulk Jobs">
            {icon}
          </Link>
        ) : (
          <div className={iconClasses}>
            {icon}
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 rounded-lg bg-white/8 animate-pulse" />
          <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
        </div>
      ) : (
        <>
          <div className={`text-2xl font-bold mb-0.5 ${accent ? 'text-brand-200' : 'text-white'}`}>{value}</div>
          <div className="text-sm text-slate-400">{label}</div>
          {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
        </>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    done:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    processing: 'bg-brand-500/15 text-brand-300 border-brand-500/20',
    queued:     'bg-slate-500/15 text-slate-400 border-slate-500/20',
    failed:     'bg-red-500/15 text-red-400 border-red-500/20',
    cancelled:  'bg-slate-600/15 text-slate-500 border-slate-600/20',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.queued}`}>
      {status === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />}
      {status}
    </span>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-2.5 text-sm shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-white font-semibold">{payload[0].value.toLocaleString()} verifications</p>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="py-10 text-center text-slate-600 text-sm">{message}</div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const navigate = useNavigate()
  const { user, credits, setSubscription } = useAuthStore()

  const [stats, setStats]         = useState(null)
  const [billing, setBilling]     = useState(null)
  const [jobs, setJobs]           = useState([])
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.get('/verify/dashboard/')
      .then(({ data }) => {
        setStats(data)
        setBilling({ credits: data.credits, plan: data.plan, plan_total: data.plan_total, used_this_month: data.used_this_month })
        setJobs(data.recent_jobs ?? [])
        setHistory(data.credit_history ?? [])
        setSubscription(data.subscription_active, data.subscription_expires_at ?? null)
      })
      .catch((e) => console.error('Overview fetch failed', e))
      .finally(() => setLoading(false))
  }, [])

  // Derived values
  const planTotal     = billing?.plan_total  ?? 0
  const usedMonth     = billing?.used_this_month ?? 0
  const creditPct     = planTotal > 0 ? Math.round((credits / planTotal) * 100) : 0
  const totalVerifs   = stats?.total ?? 0
  const localResolved = stats?.local_resolved ?? 0
  const deepChecks    = stats?.deep_checks ?? 0
  const localPct      = totalVerifs > 0 ? Math.round((localResolved / totalVerifs) * 100) : 0
  const deepPct       = totalVerifs > 0 ? Math.round((deepChecks / totalVerifs) * 100) : 0
  const jobsDone      = stats?.jobs_done ?? 0
  const jobsActive    = stats?.jobs_processing ?? 0

  // Chart data: fill missing days with 0 for a complete 30-day picture
  const chartData = (() => {
    const map = {}
    ;(stats?.daily ?? []).forEach((d) => { map[d.day] = d.verifications })
    const result = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      result.push({ day: label, verifications: map[key] ?? 0 })
    }
    return result
  })()

  // Donut: convert status_breakdown counts to percentages
  const COLORS = { valid: '#10b981', risky: '#f59e0b', invalid: '#ef4444', unknown: '#6366f1' }
  const breakdown = stats?.status_breakdown ?? {}
  const totalBd   = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const donutData = ['valid', 'invalid', 'risky', 'unknown']
    .map((s) => ({
      name:    s.charAt(0).toUpperCase() + s.slice(1),
      value:   breakdown[s] ?? 0,
      pct:     totalBd > 0 ? Math.round(((breakdown[s] ?? 0) / totalBd) * 100) : 0,
      color:   COLORS[s],
    }))
    .filter((d) => d.value > 0)

  const now = new Date()
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h2 className="text-xl font-bold text-white">Overview</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {monthLabel} · <span className="capitalize">{user?.plan ?? 'free'}</span> plan
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          accent loading={loading}
          label="Credits remaining"
          value={credits.toLocaleString()}
          sub={planTotal > 0 ? `${creditPct}% of ${planTotal.toLocaleString()}` : '100 one-time credits'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          loading={loading}
          label="Verifications total"
          value={totalVerifs.toLocaleString()}
          sub={`${usedMonth.toLocaleString()} used this month`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          loading={loading}
          label="Resolved locally"
          value={localResolved.toLocaleString()}
          sub={totalVerifs > 0 ? `${localPct}% without deep check` : 'No verifications yet'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <StatCard
          loading={loading}
          label="Bulk jobs"
          value={jobsDone.toLocaleString()}
          sub={jobsActive > 0 ? `${jobsActive} currently active` : 'All jobs complete'}
          iconTo="/dashboard/bulk"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Usage area chart */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/7 rounded-2xl p-6">
          <div className="mb-6">
            <h3 className="text-white font-semibold text-sm">Verifications over time</h3>
            <p className="text-xs text-slate-500 mt-0.5">Last 30 days</p>
          </div>
          {loading ? (
            <div className="h-[200px] animate-pulse bg-white/5 rounded-xl" />
          ) : totalVerifs === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <p className="text-slate-500 text-sm">No verifications yet</p>
                <button onClick={() => navigate('/dashboard/verify')} className="mt-3 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Verify your first email →
                </button>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="verifications" stroke="#6366f1" strokeWidth={2}
                  fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* List quality donut */}
        <div className="bg-white/[0.03] border border-white/7 rounded-2xl p-6">
          <h3 className="text-white font-semibold text-sm mb-1">List quality</h3>
          <p className="text-xs text-slate-500 mb-4">All-time breakdown</p>
          {loading ? (
            <div className="h-[150px] animate-pulse bg-white/5 rounded-xl" />
          ) : donutData.length === 0 ? (
            <div className="h-[150px] flex items-center justify-center text-slate-600 text-sm">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                    paddingAngle={3} dataKey="value">
                    {donutData.map(({ name, color }) => <Cell key={name} fill={color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [v.toLocaleString(), name]}
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12, color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {donutData.map(({ name, pct, color }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                      <span className="text-xs text-slate-400">{name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-300">{pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Engine Savings widget ──────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-950/50 to-teal-950/30 border border-emerald-800/30 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Engine Savings</h3>
              <p className="text-sm text-emerald-300/70 mt-0.5">
                <span className="font-bold text-emerald-300">{localResolved.toLocaleString()}</span> verifications resolved locally
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-300">{localPct}%</div>
              <div className="text-xs text-slate-400 mt-0.5">Resolved locally</div>
            </div>
            <div className="w-px bg-white/8 self-stretch" />
            <div>
              <div className="text-2xl font-bold text-white">{deepPct}%</div>
              <div className="text-xs text-slate-400 mt-0.5">Deep check used</div>
            </div>
            <div className="w-px bg-white/8 self-stretch" />
            <div>
              <div className="text-2xl font-bold text-brand-300">{deepChecks.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-0.5">Deep checks made</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent bulk jobs ───────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/7 rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <h3 className="text-white font-semibold text-sm">Recent bulk jobs</h3>
          <Link to="/dashboard/bulk" className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState message="No bulk jobs yet. Upload a file on the Bulk Jobs page." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['File', 'Status', 'Total', 'Valid', 'Invalid', 'Risky', 'Date'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-slate-200 font-medium max-w-[160px] truncate" title={job.filename}>
                          {job.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-3.5 text-slate-300">{(job.total_count ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-emerald-400">{job.status === 'done' ? (job.valid_count ?? 0).toLocaleString() : '—'}</td>
                    <td className="px-6 py-3.5 text-red-400">{job.status === 'done' ? (job.invalid_count ?? 0).toLocaleString() : '—'}</td>
                    <td className="px-6 py-3.5 text-amber-400">{job.status === 'done' ? (job.risky_count ?? 0).toLocaleString() : '—'}</td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Credit history ─────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/7 rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <h3 className="text-white font-semibold text-sm">Credit history</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-8 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : history.length === 0 ? (
          <EmptyState message="No credit transactions yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Date', 'Operation', 'Reference', 'Amount', 'Balance'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-slate-300 capitalize">{row.operation}</td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500 max-w-[160px] truncate">{row.reference}</td>
                    <td className={`px-6 py-3 font-semibold ${row.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {row.amount > 0 ? '+' : ''}{row.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-slate-300">{(row.balance_after ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Low credit alert ───────────────────────────────── */}
      {!loading && creditPct < 20 && planTotal > 0 && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-amber-500/8 border border-amber-500/20">
          <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-300">Credits running low</p>
            <p className="text-xs text-amber-300/60 mt-0.5">
              Only {creditPct}% of your credits remain.{' '}
              <Link to="/dashboard/billing" className="underline hover:text-amber-200 transition-colors">Upgrade your plan</Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
