import { useState } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

const STATUS_STYLES = {
  valid:   'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  invalid: 'bg-red-500/10    border-red-500/20    text-red-300',
  risky:   'bg-amber-500/10  border-amber-500/20  text-amber-300',
  unknown: 'bg-slate-500/10  border-slate-500/20  text-slate-400',
}

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.unknown
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${cls}`}>
      {status}
    </span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={copy} className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded" title="Copy email">
      {copied ? (
        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

export default function EmailFinderPage() {
  const { setCredits } = useAuthStore()
  const [form, setForm]       = useState({ first_name: '', last_name: '', domain: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setError('')
    setResult(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.last_name.trim() || !form.domain.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.post('/verify/find-email/', form)
      setResult(data)
      if (typeof data.credits_remaining === 'number') setCredits(data.credits_remaining)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Email Finder</h2>
        <p className="text-sm text-slate-400 mt-1">
          Find the professional email address for any person at a company.
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300">5 credits per search</span>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">First name</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              placeholder="John"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Last name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => update('last_name', e.target.value)}
              placeholder="Smith"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Company domain <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={form.domain}
            onChange={(e) => update('domain', e.target.value)}
            placeholder="acme.com"
            required
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition"
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !form.last_name.trim() || !form.domain.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              Find email — 5 credits
            </>
          )}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Best match */}
          {result.found ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-6">
              <div className="flex items-start gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wide mb-1">Best match found</p>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-base font-semibold">{result.found.email}</span>
                    <CopyButton text={result.found.email} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <StatusBadge status={result.found.status} />
                    <span className="text-xs text-slate-400">Score: {result.found.score}%</span>
                    {result.found.is_catch_all && (
                      <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Catch-all</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">No confirmed match found</p>
                <p className="text-slate-500 text-xs mt-0.5">None of the candidate patterns returned a verified deliverable address. Check all candidates below.</p>
              </div>
            </div>
          )}

          {/* Credits info */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>{result.candidates.length} patterns tested</span>
            <span>{result.credits_remaining} credits remaining</span>
          </div>

          {/* All candidates */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">All candidates</h3>
            </div>
            <div className="divide-y divide-white/5">
              {result.candidates.map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <span className="text-xs text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
                  <span className="flex-1 font-mono text-sm text-white truncate">{c.email}</span>
                  <CopyButton text={c.email} />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-500 hidden sm:inline">{c.score}%</span>
                    {c.is_catch_all && (
                      <span className="text-xs text-amber-300/70 hidden sm:inline">catch-all</span>
                    )}
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info box when empty */}
      {!result && !loading && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Pattern generation', desc: 'Generates 10+ common email patterns: first.last, firstlast, flast, and more.' },
            { label: 'Live verification',  desc: 'Each pattern is checked for MX and SMTP deliverability in real time.' },
            { label: 'Confidence score',   desc: 'Results are ranked by deliverability score to surface the best match.' },
            { label: '5 credits flat',     desc: 'One search covers all patterns — no per-pattern charges.' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
