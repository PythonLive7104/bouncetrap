import { useState } from 'react'
import api from '../../services/api'

const LEVEL_STYLES = {
  good:    'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  fail:    'bg-red-500/10    border-red-500/20    text-red-300',
  warn:    'bg-amber-500/10  border-amber-500/20  text-amber-300',
  unknown: 'bg-slate-500/10  border-slate-500/20  text-slate-400',
}

const LEVEL_DOT = {
  good:    'bg-emerald-400',
  fail:    'bg-red-400',
  warn:    'bg-amber-400',
  unknown: 'bg-slate-500',
}

const LEVEL_LABEL = { good: 'Pass', fail: 'Fail', warn: 'Warning', unknown: 'Unknown' }

function SummaryCard({ item }) {
  const style = LEVEL_STYLES[item.level] || LEVEL_STYLES.unknown
  const dot   = LEVEL_DOT[item.level]   || LEVEL_DOT.unknown
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${style}`}>
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{item.check}</p>
        <p className="text-xs opacity-75 truncate">{item.result}</p>
      </div>
      <span className="text-xs font-bold uppercase tracking-wide opacity-60">{LEVEL_LABEL[item.level]}</span>
    </div>
  )
}

function HopRow({ hop, index }) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-3 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-brand-500/30" />
      {index > 0 && <div className="absolute left-3.5 bottom-full top-0 w-px bg-white/10 -translate-y-full h-3" />}
      <div className="pb-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-1">
          {hop.from && <span><span className="text-slate-500">from </span><span className="text-white font-mono text-xs">{hop.from}</span></span>}
          {hop.by   && <span><span className="text-slate-500">by </span><span className="text-white font-mono text-xs">{hop.by}</span></span>}
        </div>
        {hop.date && <p className="text-xs text-slate-600">{hop.date}</p>}
      </div>
    </div>
  )
}

function HeaderRow({ label, value }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-white/5 last:border-0 text-sm">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="text-white break-all font-mono text-xs">{value}</span>
    </div>
  )
}

export default function HeaderAnalyzerPage() {
  const [raw, setRaw]         = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  async function handleAnalyze(e) {
    e.preventDefault()
    if (!raw.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.post('/deliverability/analyze-headers/', { headers: raw })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Email Header Analyzer</h2>
        <p className="text-sm text-slate-400 mt-1">
          Paste raw email headers to inspect SPF/DKIM/DMARC auth results, delivery hops, and spam signals.
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">Free — no credits used</span>
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleAnalyze} className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Paste raw email headers</label>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={10}
            placeholder={"Delivered-To: user@example.com\nReceived: from mail.example.com...\nAuthentication-Results: mx.google.com;\n  spf=pass ...\n  dkim=pass ...\n  dmarc=pass ..."}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition resize-y"
          />
          <p className="text-xs text-slate-600 mt-1">
            In Gmail: open the email → More (⋮) → Show original → Copy headers. In Outlook: File → Properties → Internet headers.
          </p>
        </div>
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading || !raw.trim()}
          className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {loading ? 'Analyzing…' : 'Analyze headers'}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Summary grid */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
            <h3 className="text-white font-semibold text-sm mb-4">Authentication summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.summary.map((item, i) => <SummaryCard key={i} item={item} />)}
            </div>
          </div>

          {/* Issues */}
          {result.issues?.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-6">
              <h3 className="text-amber-300 font-semibold text-sm mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Issues found
              </h3>
              <ul className="space-y-2">
                {result.issues.map((issue, i) => (
                  <li key={i} className="text-sm text-amber-200/80 flex gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic headers */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
            <h3 className="text-white font-semibold text-sm mb-4">Key headers</h3>
            <div>
              <HeaderRow label="From"       value={result.headers?.from} />
              <HeaderRow label="To"         value={result.headers?.to} />
              <HeaderRow label="Subject"    value={result.headers?.subject} />
              <HeaderRow label="Date"       value={result.headers?.date} />
              <HeaderRow label="Reply-To"   value={result.headers?.reply_to} />
              <HeaderRow label="Message-ID" value={result.headers?.message_id} />
              {result.spam?.score && <HeaderRow label="Spam score"  value={result.spam.score} />}
              {result.spam?.status && <HeaderRow label="Spam status" value={result.spam.status} />}
            </div>
          </div>

          {/* Auth-Results raw */}
          {result.auth_results?.raw && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h3 className="text-white font-semibold text-sm mb-3">Authentication-Results</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {[['SPF', result.auth_results.spf], ['DKIM', result.auth_results.dkim], ['DMARC', result.auth_results.dmarc]].map(([label, val]) => (
                  <div key={label} className={`px-4 py-3 rounded-xl border text-sm ${val === 'pass' ? LEVEL_STYLES.good : val ? LEVEL_STYLES.fail : LEVEL_STYLES.unknown}`}>
                    <span className="font-semibold">{label}</span>
                    <span className="ml-2 font-mono text-xs">{val || 'n/a'}</span>
                  </div>
                ))}
              </div>
              <pre className="text-xs text-slate-500 bg-white/[0.03] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all">{result.auth_results.raw}</pre>
            </div>
          )}

          {/* Received chain */}
          {result.received_chain?.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h3 className="text-white font-semibold text-sm mb-1">
                Delivery path
                <span className="ml-2 text-xs text-slate-500 font-normal">{result.hop_count} hop{result.hop_count !== 1 ? 's' : ''} (oldest first)</span>
              </h3>
              <div className="mt-4 border-l border-white/10 ml-3">
                {result.received_chain.map((hop, i) => <HopRow key={i} hop={hop} index={i} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
