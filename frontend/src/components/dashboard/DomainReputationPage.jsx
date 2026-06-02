import { useState, useEffect } from 'react'
import api from '../../services/api'

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return <span className="text-slate-500 text-xs">—</span>
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
  return <span className={`font-bold text-sm ${color}`}>{score}/100</span>
}

function CheckDot({ value }) {
  if (value === null || value === undefined) return <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
  return value
    ? <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
    : <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
}

export default function DomainReputationPage() {
  const [domains, setDomains]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [addError, setAddError] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchDomains()
  }, [])

  async function fetchDomains() {
    try {
      const { data } = await api.get('/deliverability/monitored-domains/')
      setDomains(data)
    } catch {}
    finally { setLoading(false) }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newDomain.trim()) return
    setAdding(true); setAddError('')
    try {
      const { data } = await api.post('/deliverability/monitored-domains/', { domain: newDomain.trim() })
      setDomains(prev => [data, ...prev])
      setNewDomain('')
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Failed to add domain.')
    } finally { setAdding(false) }
  }

  async function handleRemove(id) {
    try {
      await api.delete(`/deliverability/monitored-domains/${id}/`)
      setDomains(prev => prev.filter(d => d.id !== id))
      if (selected === id) { setSelected(null); setDetail(null) }
    } catch {}
  }

  async function handleSelect(id) {
    if (selected === id) { setSelected(null); setDetail(null); return }
    setSelected(id); setDetailLoading(true)
    try {
      const { data } = await api.get(`/deliverability/monitored-domains/${id}/`)
      setDetail(data)
    } catch {}
    finally { setDetailLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Domain Reputation Monitoring</h2>
        <p className="text-sm text-slate-400 mt-1">Track SPF, DMARC, DKIM, MX health and blacklist status for your domains.</p>
      </div>

      {/* Add domain */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          value={newDomain}
          onChange={e => setNewDomain(e.target.value)}
          placeholder="Add a domain to monitor (e.g. yourdomain.com)"
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={adding || !newDomain.trim()}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
        >
          {adding ? 'Checking…' : '+ Add Domain'}
        </button>
      </form>
      {addError && <p className="text-red-400 text-sm">{addError}</p>}

      {/* Domain list */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Monitored Domains</h3>
          <span className="text-xs text-slate-500">{domains.length} domain{domains.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-slate-600 text-sm">Loading…</div>
        ) : domains.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-slate-500 text-sm">No domains monitored yet. Add one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {domains.map(d => (
              <div key={d.id}>
                <div
                  className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => handleSelect(d.id)}
                >
                  {/* Score */}
                  <div className="w-14 text-center shrink-0">
                    <ScoreBadge score={d.reputation_score} />
                  </div>

                  {/* Domain + checks */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{d.domain}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {['spf_found','dmarc_found','dkim_found','mx_found'].map(k => (
                        <span key={k} className="flex items-center gap-1 text-xs text-slate-500">
                          <CheckDot value={d[k]} />
                          {k.replace('_found','').toUpperCase()}
                        </span>
                      ))}
                      {d.blacklisted_on?.length > 0 && (
                        <span className="text-xs text-red-400 font-medium">
                          ⚠ Blacklisted on {d.blacklisted_on.length} list{d.blacklisted_on.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last checked + remove */}
                  <div className="shrink-0 flex items-center gap-3">
                    {d.last_checked_at && (
                      <span className="hidden sm:block text-xs text-slate-600">
                        {new Date(d.last_checked_at).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(d.id) }}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {selected === d.id && (
                  <div className="px-5 pb-5 bg-white/[0.015]">
                    {detailLoading ? (
                      <p className="text-slate-500 text-sm py-3">Loading history…</p>
                    ) : detail && (
                      <>
                        {detail.blacklisted_on?.length > 0 && (
                          <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 text-xs font-semibold">Blacklisted on: {detail.blacklisted_on.join(', ')}</p>
                          </div>
                        )}
                        {detail.history?.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Score History</p>
                            <div className="flex items-end gap-1 h-12">
                              {detail.history.slice(0, 30).reverse().map((s, i) => (
                                <div
                                  key={i}
                                  title={`${new Date(s.checked_at).toLocaleDateString()} — ${s.reputation_score}/100`}
                                  className={`flex-1 rounded-sm transition-all ${
                                    s.reputation_score >= 80 ? 'bg-emerald-500' :
                                    s.reputation_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ height: `${s.reputation_score}%` }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
