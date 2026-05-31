import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const PROVIDER_ICONS = {
  gmail:   { label: 'Gmail',   color: 'text-red-400',   bg: 'bg-red-500/10   border-red-500/20' },
  outlook: { label: 'Outlook', color: 'text-blue-400',  bg: 'bg-blue-500/10  border-blue-500/20' },
  yahoo:   { label: 'Yahoo',   color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
}

const PLACEMENT_STYLES = {
  inbox:   { label: 'Inbox',    cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' },
  spam:    { label: 'Spam',     cls: 'bg-red-500/10    border-red-500/20    text-red-300' },
  missing: { label: 'Not found', cls: 'bg-slate-500/10  border-slate-500/20  text-slate-400' },
}

function PlacementBadge({ placement }) {
  const s = PLACEMENT_STYLES[placement] || PLACEMENT_STYLES.missing
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  )
}

function ScoreRing({ score }) {
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const r = 36, c = 44, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}%</span>
        <span className="text-xs text-slate-500">inbox</span>
      </div>
    </div>
  )
}

function TestCard({ test, onSelect, selected }) {
  const doneAt = test.completed_at ? new Date(test.completed_at).toLocaleDateString() : null
  return (
    <button
      onClick={() => onSelect(test)}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selected ? 'border-brand-500/50 bg-brand-500/5' : 'border-white/8 bg-white/[0.02] hover:border-white/15'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white truncate">{test.subject}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${test.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : test.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-brand-500/10 border-brand-500/20 text-brand-300'}`}>
          {test.status}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-xs text-slate-500">{doneAt || 'In progress…'}</span>
        {test.status === 'done' && (
          <span className="text-xs font-semibold" style={{ color: test.inbox_score >= 80 ? '#10b981' : test.inbox_score >= 50 ? '#f59e0b' : '#ef4444' }}>
            {test.inbox_score}% inbox
          </span>
        )}
      </div>
    </button>
  )
}

export default function InboxPlacementPage() {
  const { setCredits } = useAuthStore()
  const [form, setForm]         = useState({ subject: 'Inbox placement test', body: '' })
  const [submitting, setSub]    = useState(false)
  const [error, setError]       = useState('')
  const [unavailable, setUnavail] = useState(false)
  const [tests, setTests]       = useState([])
  const [selected, setSelected] = useState(null)
  const pollRef                 = useRef(null)

  // Load previous tests
  useEffect(() => {
    api.get('/deliverability/inbox-placement/').then(({ data }) => setTests(data)).catch(() => {})
    return () => clearInterval(pollRef.current)
  }, [])

  // Poll selected test until done/failed
  useEffect(() => {
    clearInterval(pollRef.current)
    if (selected && !['done', 'failed'].includes(selected.status)) {
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await api.get(`/deliverability/inbox-placement/${selected.id}/`)
          setSelected(data)
          setTests((prev) => prev.map((t) => t.id === data.id ? data : t))
          if (['done', 'failed'].includes(data.status)) clearInterval(pollRef.current)
        } catch {}
      }, 5000)
    }
    return () => clearInterval(pollRef.current)
  }, [selected?.id, selected?.status])

  async function handleSubmit(e) {
    e.preventDefault()
    setSub(true)
    setError('')
    try {
      const { data } = await api.post('/deliverability/inbox-placement/', form)
      if (typeof data.credits_remaining === 'number') setCredits(data.credits_remaining)
      setTests((prev) => [data, ...prev])
      setSelected(data)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 503) {
        setUnavail(true)
        setError(detail || 'Inbox placement is not configured on this server.')
      } else {
        setError(detail || 'Could not start test. Please try again.')
      }
    } finally {
      setSub(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Inbox Placement Tester</h2>
        <p className="text-sm text-slate-400 mt-1">
          Send a test email through real seed accounts to see if it lands in inbox or spam across major providers.
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300">3 credits per test</span>
        </p>
      </div>

      {/* New test form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">New placement test</h3>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Email subject <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            required
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Email body <span className="text-slate-600">(optional)</span></label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={4}
            placeholder="Write the email content you want to test for spam placement…"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition resize-y"
          />
        </div>

        {unavailable && (
          <div className="px-4 py-4 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-300 text-sm">
            <p className="font-semibold mb-1">Feature requires server configuration</p>
            <p className="text-slate-400 text-xs">To enable inbox placement, add seed account credentials (<code>SEED_GMAIL_EMAIL</code>, <code>SEED_GMAIL_PASSWORD</code>, etc.) to the server <code>.env</code> file and restart the server.</p>
          </div>
        )}

        {error && !unavailable && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting || !form.subject.trim() || unavailable}
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting…
            </>
          ) : (
            'Run placement test — 3 credits'
          )}
        </button>
      </form>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Test list */}
        {tests.length > 0 && (
          <div className="sm:col-span-1 space-y-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide px-1">Recent tests</p>
            {tests.map((t) => (
              <TestCard key={t.id} test={t} onSelect={setSelected} selected={selected?.id === t.id} />
            ))}
          </div>
        )}

        {/* Selected test detail */}
        {selected && (
          <div className={tests.length > 0 ? 'sm:col-span-2' : 'sm:col-span-3'}>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-white font-semibold">{selected.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Token: <span className="font-mono">{selected.test_token}</span></p>
                </div>
                {selected.status === 'done' && <ScoreRing score={selected.inbox_score} />}
              </div>

              {/* Pending/checking state */}
              {['pending', 'sent', 'checking'].includes(selected.status) && (
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <svg className="w-4 h-4 animate-spin text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {selected.status === 'sent' ? 'Email sent — waiting ~30 seconds before checking…' :
                   selected.status === 'checking' ? 'Checking seed inboxes…' : 'Queued for sending…'}
                </div>
              )}

              {/* Results grid */}
              {selected.results?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selected.results.map((r, i) => {
                    const prov = PROVIDER_ICONS[r.provider] || { label: r.provider, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
                    return (
                      <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${prov.bg}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${prov.color}`}>{prov.label}</span>
                          <span className="text-xs text-slate-600 hidden sm:inline">{r.seed_email}</span>
                        </div>
                        <PlacementBadge placement={r.placement} />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Score breakdown */}
              {selected.status === 'done' && (
                <div className="text-sm text-slate-400">
                  {selected.inbox_score >= 80
                    ? 'Your email has good inbox placement across major providers.'
                    : selected.inbox_score >= 50
                    ? 'Some providers are filtering your email to spam. Review your SPF/DKIM/DMARC records and content.'
                    : 'Most providers are sending your email to spam. Urgent: check authentication, sender reputation, and email content.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state when no tests */}
        {tests.length === 0 && !selected && (
          <div className="sm:col-span-3 rounded-2xl border border-white/5 bg-white/[0.01] p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium text-sm">No tests yet</p>
            <p className="text-slate-600 text-xs mt-1">Run your first test to see where your emails land across Gmail, Outlook, and Yahoo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
