import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import SubscriptionExpiredModal from './SubscriptionExpiredModal'

const STATUS_CONFIG = {
  valid:   { label: 'Valid',   bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400', desc: 'Valid and deliverable email address' },
  invalid: { label: 'Invalid', bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400',     desc: 'Invalid or undeliverable email address' },
  risky:   { label: 'Risky',   bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400',   desc: 'Email exists but delivery is uncertain' },
  unknown: { label: 'Unknown', bg: 'bg-slate-500/15',   text: 'text-slate-400',   border: 'border-slate-500/30',   dot: 'bg-slate-400',   desc: 'Could not determine deliverability' },
}

const ELV_CODE_LABELS = {
  ok:                   'Mailbox OK',
  ok_for_all:           'Catch-all server',
  email_disabled:       'Mailbox disabled',
  dead_server:          'Dead server / no MX',
  disposable:           'Disposable address',
  spamtrap:             'Spam trap',
  abuse:                'Abuse complaint history',
  do_not_mail:          'Do-not-mail list',
  role_based:           'Role-based address',
  global_suppression:   'Global suppression list',
  antispam_system:      'Anti-spam system blocked probe',
  unknown:              'Inconclusive',
  timeout:              'Server timed out',
  deep_check_inconclusive: 'Inconclusive',
}

function ScoreRing({ score }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const fill = circ - (score / 100) * circ
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="80" height="80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="text-center">
        <div className="text-xl font-bold text-white leading-none">{score}</div>
        <div className="text-[9px] text-slate-500 mt-0.5">score</div>
      </div>
    </div>
  )
}

function Row({ label, value, valueClass = 'text-white' }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}

function YesNoRow({ label, value, yesClass = 'text-red-400', noClass = 'text-emerald-400' }) {
  if (value === null || value === undefined) return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-500/15 text-slate-500">—</span>
    </div>
  )
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-xs px-2.5 py-0.5 rounded font-bold ${value ? `${yesClass} bg-red-500/10` : `${noClass} bg-emerald-500/10`}`}>
        {value ? 'YES' : 'NO'}
      </span>
    </div>
  )
}

const STATUS_ROW = {
  valid:   { cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  invalid: { cls: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  risky:   { cls: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  unknown: { cls: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
}

export default function VerifyEmailPage() {
  const { credits, setCredits } = useAuthStore()
  const [email, setEmail]           = useState('')
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const [history, setHistory]       = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    api.get('/verify/results/')
      .then(({ data }) => setHistory(Array.isArray(data) ? data.slice(0, 10) : (data.results ?? []).slice(0, 10)))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [])

  async function handleVerify(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.post('/verify/single/', { email: email.trim() })
      setResult(data)
      if (typeof data.credits_remaining === 'number') setCredits(data.credits_remaining)
      else setCredits(Math.max(0, credits - 1))
      // Prepend to history
      setHistory((prev) => [
        { email: data.email, status: data.status, score: data.score, created_at: new Date().toISOString() },
        ...prev,
      ].slice(0, 10))
    } catch (err) {
      if (err.response?.status === 402 && err.response?.data?.detail?.includes('subscription')) {
        setShowExpiredModal(true)
      } else {
        setError(err.response?.data?.detail || 'Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const cfg = result ? (STATUS_CONFIG[result.status] || STATUS_CONFIG.unknown) : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showExpiredModal && <SubscriptionExpiredModal onClose={() => setShowExpiredModal(false)} />}
      <div>
        <h2 className="text-xl font-bold text-white">Verify Email Address</h2>
        <p className="text-sm text-slate-400 mt-1">Full verification pipeline with real-time deliverability check. Costs 1 credit.</p>
      </div>

      {/* Input */}
      <form onSubmit={handleVerify} className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter an email address to verify…"
          className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking…
            </span>
          ) : 'Verify'}
        </button>
      </form>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Result */}
      {result && cfg && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">

          {/* Hero banner */}
          <div className={`px-6 py-5 ${cfg.bg} border-b border-white/5`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Verified email</p>
                <p className="text-white font-bold text-xl truncate">{result.email}</p>
                <p className={`text-sm font-semibold mt-1.5 ${cfg.text}`}>{cfg.desc}</p>
              </div>
              <ScoreRing score={result.score} />
            </div>

            {/* Status + ELV code badges */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              {result.elv_code && (
                <span className="px-3 py-1 rounded-full border border-white/10 text-xs font-mono text-slate-400 bg-white/5">
                  {result.elv_code}
                </span>
              )}
              {result.elv_code && ELV_CODE_LABELS[result.elv_code] && (
                <span className="text-xs text-slate-500">{ELV_CODE_LABELS[result.elv_code]}</span>
              )}
            </div>
          </div>

          {/* Two-column detail grid */}
          <div className="grid grid-cols-2 divide-x divide-white/5">

            {/* Left column */}
            <div className="px-5 py-4">
              <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Email details</p>
              <Row label="Domain"  value={result.domain} valueClass="text-slate-300 font-mono text-xs" />
              <Row label="Account" value={result.account} valueClass="text-slate-300 font-mono text-xs" />
              {result.esp && <Row label="ESP" value={result.esp} valueClass="text-brand-300" />}
              {result.mx_record && (
                <div className="flex items-start justify-between py-2.5 border-b border-white/5">
                  <span className="text-sm text-slate-500 shrink-0">MX Server</span>
                  <span className="text-xs font-mono text-slate-300 text-right ml-2 break-all">{result.mx_record}</span>
                </div>
              )}
              <Row
                label="MX found"
                value={result.mx_found ? 'Yes' : 'No'}
                valueClass={result.mx_found ? 'text-emerald-400' : 'text-red-400'}
              />
            </div>

            {/* Right column */}
            <div className="px-5 py-4">
              <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-1">Flags</p>
              <YesNoRow label="Disposable"  value={result.is_disposable} />
              <YesNoRow label="Role address" value={result.is_role_based} />
              <YesNoRow label="Catch-all"   value={result.is_catch_all} />
              <YesNoRow
                label="Free email"
                value={result.is_free_email}
                yesClass="text-slate-400"
                noClass="text-slate-400"
              />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-600 text-center">
        You have <span className="text-slate-400 font-medium">{credits.toLocaleString()}</span> credit{credits !== 1 ? 's' : ''} remaining
      </p>

      {/* ── Recent verifications ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Recent verifications</h3>
          <span className="text-xs text-slate-500">Last 10</span>
        </div>

        {historyLoading ? (
          <div className="divide-y divide-white/5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4 animate-pulse">
                <div className="h-3.5 w-48 rounded bg-white/8 flex-1" />
                <div className="h-5 w-16 rounded-full bg-white/8" />
                <div className="h-3.5 w-10 rounded bg-white/5" />
                <div className="h-3 w-24 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-600 text-sm">
            No verifications yet. Try one above.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {history.map((row, i) => {
              const s = STATUS_ROW[row.status] || STATUS_ROW.unknown
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3 text-sm">
                  <span className="flex-1 min-w-0 text-slate-300 font-mono text-xs truncate">{row.email}</span>
                  <span className={`shrink-0 px-2.5 py-0.5 rounded-full border text-xs font-semibold capitalize ${s.bg} ${s.cls}`}>
                    {row.status}
                  </span>
                  <span className="shrink-0 w-10 text-right text-xs text-slate-500 font-mono">
                    {row.score != null ? `${Math.round(row.score * 100)}%` : '—'}
                  </span>
                  <span className="shrink-0 hidden sm:block text-xs text-slate-600 w-28 text-right">
                    {new Date(row.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
