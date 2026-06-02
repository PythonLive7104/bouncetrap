import { useState } from 'react'
import api from '../../services/api'

const COMMON_PORTS = [
  { port: 25,  label: '25 — SMTP (outbound)' },
  { port: 465, label: '465 — SMTPS (implicit TLS)' },
  { port: 587, label: '587 — Submission (STARTTLS)' },
  { port: 2525, label: '2525 — Alternative submission' },
]

const STATUS_STYLES = {
  pass: { cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: '✓' },
  warn: { cls: 'text-amber-400  bg-amber-500/10  border-amber-500/25',  icon: '⚠' },
  fail: { cls: 'text-red-400    bg-red-500/10    border-red-500/25',    icon: '✗' },
  info: { cls: 'text-slate-400  bg-slate-500/10  border-slate-500/25',  icon: 'ℹ' },
}

function TestRow({ test, status: s, detail }) {
  const cfg = STATUS_STYLES[s] || STATUS_STYLES.info
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <span className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${cfg.cls}`}>
        {cfg.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{test}</p>
        <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
      </div>
    </div>
  )
}

export default function SMTPTestingPage() {
  const [host, setHost]       = useState('')
  const [port, setPort]       = useState(587)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  async function handleTest(e) {
    e.preventDefault()
    if (!host.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const { data } = await api.post('/deliverability/smtp-test/', { host: host.trim(), port })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Test failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const overallCfg = result ? (STATUS_STYLES[result.overall] || STATUS_STYLES.info) : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">SMTP Testing</h2>
        <p className="text-sm text-slate-400 mt-1">Test SMTP server connectivity, TLS configuration and supported features.</p>
      </div>

      <form onSubmit={handleTest} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">SMTP Hostname</label>
          <input
            value={host}
            onChange={e => setHost(e.target.value)}
            placeholder="mail.example.com or smtp.gmail.com"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Port</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COMMON_PORTS.map(p => (
              <button
                key={p.port}
                type="button"
                onClick={() => setPort(p.port)}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors text-left ${
                  port === p.port
                    ? 'border-brand-500/60 bg-brand-600/15 text-brand-300'
                    : 'border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !host.trim()}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Testing…
            </span>
          ) : 'Run SMTP Test'}
        </button>
      </form>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
          <div className={`px-5 py-4 border-b border-white/6 flex items-center gap-3 ${overallCfg?.cls} bg-opacity-5`}>
            <span className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold ${overallCfg?.cls}`}>
              {overallCfg?.icon}
            </span>
            <div>
              <p className="font-semibold text-white">{result.host}:{result.port}</p>
              <p className="text-xs mt-0.5 capitalize">{result.overall === 'pass' ? 'All tests passed' : result.overall === 'warn' ? 'Passed with warnings' : 'Tests failed'}</p>
            </div>
          </div>
          <div className="px-5 py-2">
            {result.results.map((r, i) => (
              <TestRow key={i} test={r.test} status={r.status} detail={r.detail} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
