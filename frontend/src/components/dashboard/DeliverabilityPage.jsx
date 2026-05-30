import { useState } from 'react'
import api from '../../services/api'

function gradeFromResults(dns, mx) {
  if (!dns && !mx) return null
  let score = 0
  if (mx?.mx_found)      score += 25
  if (dns?.spf?.found)   score += 25
  if (dns?.dmarc?.found) score += 25
  if (dns?.dkim?.found)  score += 25
  // Bonus: DMARC policy stronger than 'none'
  const policy = dns?.dmarc?.policy
  if (policy === 'reject' || policy === 'quarantine') score = Math.min(100, score + 5)

  if (score >= 95) return { letter: 'A+', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', label: 'Excellent' }
  if (score >= 75) return { letter: 'A',  color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', label: 'Very good' }
  if (score >= 50) return { letter: 'B',  color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   label: 'Needs attention' }
  if (score >= 25) return { letter: 'C',  color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  label: 'Poor setup' }
  return               { letter: 'F',  color: 'text-red-400',    bg: 'bg-red-500/15',     border: 'border-red-500/30',     label: 'Critical issues' }
}

function CheckCard({ title, icon, result, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/10" />
          <div className="h-4 w-20 rounded bg-white/10" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-white/8" />
          <div className="h-3 w-3/4 rounded bg-white/8" />
        </div>
      </div>
    )
  }
  if (!result) return null

  const found = result.found
  const borderColor = found ? 'border-emerald-500/25' : 'border-red-500/25'
  const iconBg      = found ? 'bg-emerald-500/15'     : 'bg-red-500/15'
  const iconColor   = found ? 'text-emerald-400'      : 'text-red-400'
  const badgeCls    = found
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : 'bg-red-500/15 text-red-400 border-red-500/30'

  return (
    <div className={`rounded-2xl border ${borderColor} bg-white/[0.03] p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            <span className={iconColor}>{icon}</span>
          </div>
          <h4 className="text-white font-semibold text-sm">{title}</h4>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${badgeCls}`}>
          {found ? 'Found' : 'Missing'}
        </span>
      </div>

      {result.record && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/8 overflow-x-auto">
          <code className="text-xs text-slate-300 whitespace-nowrap font-mono">{result.record}</code>
        </div>
      )}
      {result.policy && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-slate-500">Policy:</span>
          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
            result.policy === 'reject'     ? 'text-emerald-400 bg-emerald-500/10' :
            result.policy === 'quarantine' ? 'text-amber-400   bg-amber-500/10'   :
                                             'text-slate-400   bg-white/5'
          }`}>{result.policy}</span>
        </div>
      )}
      {result.selector && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-slate-500">Selector:</span>
          <span className="text-xs font-mono text-slate-300">{result.selector}</span>
        </div>
      )}
      <p className="text-xs text-slate-400">{result.guidance}</p>
    </div>
  )
}

function MXCard({ records, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 animate-pulse">
        <div className="h-4 w-32 rounded bg-white/10 mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-white/8" />
          <div className="h-3 w-2/3 rounded bg-white/8" />
        </div>
      </div>
    )
  }
  if (!records) return null

  const found = records.mx_found
  return (
    <div className={`rounded-2xl border ${found ? 'border-emerald-500/25' : 'border-red-500/25'} bg-white/[0.03] p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${found ? 'bg-emerald-500/15' : 'bg-red-500/15'} flex items-center justify-center`}>
            <svg className={`w-4 h-4 ${found ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <h4 className="text-white font-semibold text-sm">MX Records</h4>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${found ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
          {found ? `${records.count} record${records.count !== 1 ? 's' : ''}` : 'None found'}
        </span>
      </div>

      {records.mx_records?.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {records.mx_records.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/8">
              <span className="text-xs text-slate-600 font-mono w-8 shrink-0 text-right">{r.priority ?? i + 1}</span>
              <span className="text-xs font-mono text-slate-300">{r.hostname || r}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">{records.guidance}</p>
    </div>
  )
}

function HealthGrade({ dns, mx }) {
  const grade = gradeFromResults(dns, mx)
  if (!grade) return null

  const checks = [
    { label: 'MX Record',  pass: mx?.mx_found,      weight: '25 pts' },
    { label: 'SPF Record', pass: dns?.spf?.found,   weight: '25 pts' },
    { label: 'DMARC',      pass: dns?.dmarc?.found, weight: '25 pts' },
    { label: 'DKIM',       pass: dns?.dkim?.found,  weight: '25 pts' },
  ]
  const policyBonus = dns?.dmarc?.policy === 'reject' || dns?.dmarc?.policy === 'quarantine'

  return (
    <div className={`rounded-2xl border ${grade.border} ${grade.bg} p-5`}>
      <div className="flex items-center gap-5">
        {/* Grade circle */}
        <div className={`w-16 h-16 rounded-2xl border-2 ${grade.border} flex items-center justify-center shrink-0`}>
          <span className={`text-2xl font-black ${grade.color}`}>{grade.letter}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white font-bold">{dns?.domain || 'Domain'}</p>
            <span className={`text-xs font-semibold ${grade.color}`}>{grade.label}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5">
                {c.pass ? (
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className="text-xs text-slate-400">{c.label}</span>
              </div>
            ))}
            {policyBonus && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-emerald-400">DMARC enforced</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const spfIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)
const dmarcIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H10.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
)
const dkimIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

function BlacklistPanel({ result, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
          <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
          <div className="ml-auto h-5 w-24 rounded-full bg-white/8 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3 animate-pulse">Querying DNS blacklists…</p>
      </div>
    )
  }

  if (!result) return null

  const { listed_count, clean_count, total_checked, blacklisted, domain, ips_checked, domain_results, ip_results } = result

  // Flatten all results for the grid — deduplicate by blacklist name
  const allByName = {}
  ;(domain_results || []).forEach((r) => {
    if (!allByName[r.name]) allByName[r.name] = r
    else if (r.listed) allByName[r.name] = r
  })
  Object.entries(ip_results || {}).forEach(([, list]) => {
    list.forEach((r) => {
      if (!allByName[r.name]) allByName[r.name] = r
      else if (r.listed) allByName[r.name] = r
    })
  })
  const entries = Object.values(allByName)

  return (
    <div className={`rounded-2xl border p-5 ${blacklisted ? 'border-red-500/25 bg-red-500/[0.03]' : 'border-emerald-500/20 bg-emerald-500/[0.02]'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${blacklisted ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
          <svg className={`w-4 h-4 ${blacklisted ? 'text-red-400' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {blacklisted
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            }
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Blacklist Monitor</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {ips_checked?.length > 0 ? `Checked ${domain} + ${ips_checked.length} IP${ips_checked.length > 1 ? 's' : ''}` : `Checked ${domain}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {blacklisted ? (
            <span className="text-xs px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 font-semibold">
              {listed_count} blacklist{listed_count !== 1 ? 's' : ''} listed
            </span>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold">
              All clean
            </span>
          )}
          <span className="text-xs text-slate-600">{total_checked} checked</span>
        </div>
      </div>

      {/* IPs checked */}
      {ips_checked?.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-slate-600">IPs:</span>
          {ips_checked.map((ip) => (
            <span key={ip} className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/8 text-slate-400">{ip}</span>
          ))}
        </div>
      )}

      {/* Blacklist grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {entries.map((entry) => {
          const isListed = entry.listed === true
          const isError  = entry.listed === null
          return (
            <div
              key={entry.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                isListed
                  ? 'bg-red-500/10 border-red-500/25 text-red-300'
                  : isError
                    ? 'bg-white/[0.03] border-white/8 text-slate-600'
                    : 'bg-white/[0.03] border-white/8 text-slate-400'
              }`}
            >
              {isListed ? (
                <svg className="w-3 h-3 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : isError ? (
                <svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="truncate font-medium">{entry.name}</span>
            </div>
          )
        })}
      </div>

      {blacklisted && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 text-xs text-red-300/80 leading-relaxed">
          Your domain or mail servers appear on {listed_count} blacklist{listed_count !== 1 ? 's' : ''}.
          This can cause emails to land in spam or be rejected. Contact the blacklist operator to request removal.
        </div>
      )}
    </div>
  )
}

export default function DeliverabilityPage() {
  const [domain, setDomain]           = useState('')
  const [dnsResult, setDnsResult]     = useState(null)
  const [mxResult, setMxResult]       = useState(null)
  const [blResult, setBlResult]       = useState(null)
  const [loading, setLoading]         = useState(false)
  const [blLoading, setBlLoading]     = useState(false)
  const [error, setError]             = useState('')
  const [history, setHistory]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('bt_deliv_history') || '[]') } catch { return [] }
  })

  async function handleCheck(e) {
    e.preventDefault()
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*/, '')
    if (!d) return
    setError('')
    setDnsResult(null)
    setMxResult(null)
    setBlResult(null)
    setLoading(true)
    setBlLoading(true)

    try {
      const [dns, mx] = await Promise.all([
        api.get(`/deliverability/dns-check/?domain=${encodeURIComponent(d)}`),
        api.get(`/deliverability/mx-check/?domain=${encodeURIComponent(d)}`),
      ])
      setDnsResult(dns.data)
      setMxResult(mx.data)
      setLoading(false)

      // Save to history
      const entry = { domain: d, checkedAt: new Date().toISOString(), spf: dns.data?.spf?.found, dmarc: dns.data?.dmarc?.found, dkim: dns.data?.dkim?.found, mx: mx.data?.mx_found }
      const next = [entry, ...history.filter((h) => h.domain !== d)].slice(0, 5)
      setHistory(next)
      localStorage.setItem('bt_deliv_history', JSON.stringify(next))

      // Blacklist check runs after DNS (takes longer due to concurrent DNSBL queries)
      try {
        const bl = await api.get(`/deliverability/blacklist/?domain=${encodeURIComponent(d)}`)
        setBlResult(bl.data)
      } catch {
        setBlResult(null)
      } finally {
        setBlLoading(false)
      }
    } catch (err) {
      setLoading(false)
      setBlLoading(false)
      setError(err.response?.data?.detail || 'Check failed. Please try again.')
    }
  }

  function loadFromHistory(h) {
    setDomain(h.domain)
  }

  const checked = dnsResult || mxResult || blResult

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Deliverability Tools</h2>
        <p className="text-sm text-slate-400 mt-1">Check SPF, DMARC, DKIM and MX records for any domain to diagnose delivery issues.</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleCheck} className="flex gap-3">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Enter a domain (e.g. gmail.com)"
          className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !domain.trim()}
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
          ) : 'Check domain'}
        </button>
      </form>

      {/* Recent history chips */}
      {history.length > 0 && !checked && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-600">Recent:</span>
          {history.map((h) => (
            <button
              key={h.domain}
              onClick={() => loadFromHistory(h)}
              className="text-xs px-2.5 py-1 rounded-lg border border-white/8 text-slate-400 hover:text-white hover:border-white/20 transition-colors font-mono"
            >
              {h.domain}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 animate-pulse h-24" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0,1,2].map((i) => <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 animate-pulse h-36" />)}
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 animate-pulse h-28" />
        </>
      )}

      {/* Results */}
      {!loading && checked && (
        <>
          {/* Health grade */}
          <HealthGrade dns={dnsResult} mx={mxResult} />

          {/* DNS record cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CheckCard title="SPF"   icon={spfIcon}   result={dnsResult?.spf}   loading={false} />
            <CheckCard title="DMARC" icon={dmarcIcon} result={dnsResult?.dmarc} loading={false} />
            <CheckCard title="DKIM"  icon={dkimIcon}  result={dnsResult?.dkim}  loading={false} />
          </div>

          {/* MX records */}
          <MXCard records={mxResult} loading={false} />

          {/* Blacklist monitor */}
          <BlacklistPanel result={blResult} loading={blLoading} />

          {/* Recent history table */}
          {history.length > 1 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/6">
                <h3 className="text-sm font-semibold text-white">Recent checks</h3>
              </div>
              <div className="divide-y divide-white/5">
                {history.map((h) => {
                  const flags = [h.spf && 'SPF', h.dmarc && 'DMARC', h.dkim && 'DKIM', h.mx && 'MX'].filter(Boolean)
                  const missing = [!h.spf && 'SPF', !h.dmarc && 'DMARC', !h.dkim && 'DKIM', !h.mx && 'MX'].filter(Boolean)
                  return (
                    <div key={h.domain} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-white font-mono">{h.domain}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{new Date(h.checkedAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {flags.map((f) => (
                          <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">{f}</span>
                        ))}
                        {missing.map((f) => (
                          <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">{f}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !checked && (
        <div className="space-y-4">
          {/* Hero card */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
            {/* Gradient band */}
            <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-violet-500 to-emerald-500" />
            <div className="px-8 py-10 text-center">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600/30 to-violet-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Check your domain health</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                Instantly inspect SPF, DMARC, DKIM and MX records for any domain.
                Get a health grade and fix recommendations in seconds.
              </p>
              {/* Free badge */}
              <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-semibold text-emerald-400">Free — no credits required</span>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'SPF',
                full: 'Sender Policy Framework',
                desc: 'Verifies which mail servers are authorised to send on behalf of your domain.',
                color: 'text-brand-300', bg: 'bg-brand-500/10', border: 'border-brand-500/20',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                label: 'DMARC',
                full: 'Domain-Based Auth',
                desc: "Defines what happens when SPF/DKIM checks fail. Protects your domain's reputation.",
                color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/20',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H10.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                ),
              },
              {
                label: 'DKIM',
                full: 'Email Signature',
                desc: 'Adds a cryptographic signature to outbound emails, proving they are not tampered with.',
                color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                ),
              },
              {
                label: 'MX',
                full: 'Mail Exchange',
                desc: 'Confirms that your domain has valid mail servers configured to receive incoming email.',
                color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
              },
            ].map(({ label, full, desc, color, bg, border, icon }) => (
              <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 flex flex-col gap-2`}>
                <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center ${color}`}>
                  {icon}
                </div>
                <div>
                  <p className={`text-sm font-bold ${color}`}>{label}</p>
                  <p className="text-xs text-slate-500 font-medium">{full}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Grade scale preview */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Health grade scale</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { grade: 'A+', label: 'Excellent',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
                { grade: 'A',  label: 'Very good',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
                { grade: 'B',  label: 'Needs attention', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
                { grade: 'C',  label: 'Poor setup',      color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/25' },
                { grade: 'F',  label: 'Critical',        color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25' },
              ].map(({ grade, label, color, bg }) => (
                <div key={grade} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${bg}`}>
                  <span className={`font-black text-sm ${color}`}>{grade}</span>
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
