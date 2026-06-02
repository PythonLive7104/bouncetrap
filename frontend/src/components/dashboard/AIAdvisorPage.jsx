import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

function ScoreRing({ score }) {
  const r = 36, circ = 2 * Math.PI * r
  const fill = circ - (score / 100) * circ
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
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

function CheckRow({ label, found }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      {found === null || found === undefined
        ? <span className="text-xs text-slate-600">—</span>
        : found
          ? <span className="text-xs font-semibold text-emerald-400">✓ Found</span>
          : <span className="text-xs font-semibold text-red-400">✗ Missing</span>
      }
    </div>
  )
}

export default function AIAdvisorPage() {
  const [domain, setDomain]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  async function handleAnalyze(e) {
    e.preventDefault()
    if (!domain.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const { data } = await api.post('/deliverability/ai-advisor/', { domain: domain.trim() })
      setResult(data)
    } catch (err) {
      if (err.response?.status === 501) {
        setError('AI advisor requires an Anthropic API key. Add ANTHROPIC_API_KEY to your backend .env file.')
      } else {
        setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">AI Deliverability Advisor</h2>
        <p className="text-sm text-slate-400 mt-1">
          Enter a domain and get an AI-powered analysis of its email deliverability health with step-by-step fixes.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="flex gap-3">
        <input
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="yourdomain.com"
          className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !domain.trim()}
          className="px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Analysing…
            </span>
          ) : 'Analyse Domain'}
        </button>
      </form>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {loading && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-10 text-center">
          <svg className="animate-spin w-10 h-10 text-brand-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-slate-400 text-sm">Running DNS checks and generating AI analysis…</p>
          <p className="text-slate-600 text-xs mt-1">This takes about 10–15 seconds</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Score + DNS summary */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-center gap-5">
              <ScoreRing score={result.score} />
              <div className="flex-1">
                <p className="text-white font-bold text-lg">{result.domain}</p>
                <p className={`text-sm font-medium mt-0.5 ${
                  result.score >= 80 ? 'text-emerald-400' :
                  result.score >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {result.score >= 80 ? 'Good deliverability' : result.score >= 50 ? 'Needs improvement' : 'Poor deliverability'}
                </p>
                {result.checks.blacklisted_on?.length > 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    ⚠ Blacklisted on: {result.checks.blacklisted_on.join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 mt-4 border-t border-white/5 pt-4">
              <CheckRow label="SPF Record"  found={result.checks.spf_found} />
              <CheckRow label="DMARC Record" found={result.checks.dmarc_found} />
              <CheckRow label="DKIM (default)" found={result.checks.dkim_found} />
              <CheckRow label="MX Records"  found={result.checks.mx_found} />
            </div>
          </div>

          {/* AI analysis */}
          <div className="rounded-2xl border border-brand-800/30 bg-brand-950/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-brand-300 font-semibold text-sm">AI Analysis</h3>
              <span className="text-xs text-slate-600 ml-auto">Powered by OpenAI</span>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              {result.advice.split('\n').map((line, i) => {
                if (line.startsWith('## ') || line.startsWith('# ')) {
                  return <h3 key={i} className="text-white font-bold text-sm mt-4 mb-1 first:mt-0">{line.replace(/^#+\s/, '')}</h3>
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="text-slate-200 font-semibold text-sm mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
                }
                if (line.startsWith('- ') || line.match(/^\d+\./)) {
                  return <p key={i} className="text-slate-300 text-sm pl-3 border-l border-brand-800/40 my-1">{line}</p>
                }
                if (line.trim() === '') return <div key={i} className="h-1" />
                return <p key={i} className="text-slate-400 text-sm my-1">{line}</p>
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              to="/dashboard/deliverability"
              className="text-sm px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            >
              Full DNS Check →
            </Link>
            <Link
              to="/dashboard/domain-reputation"
              className="text-sm px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            >
              Monitor this domain →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
