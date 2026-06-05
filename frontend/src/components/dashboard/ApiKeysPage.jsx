import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')

function CopyButton({ text, size = 'md' }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-slate-500 hover:text-slate-300 transition-colors" title="Copy">
      {copied ? (
        <svg className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

function CodeBlock({ code, language = 'bash' }) {
  return (
    <div className="relative rounded-xl bg-black/40 border border-white/8 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/6">
        <span className="text-xs text-slate-600 font-mono">{language}</span>
        <CopyButton text={code} size="sm" />
      </div>
      <pre className="px-4 py-3 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">{code}</pre>
    </div>
  )
}

export default function ApiKeysPage() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()
  const [keys, setKeys]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [newName, setNewName]         = useState('')
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')
  const [newKey, setNewKey]           = useState(null)
  const [revoking, setRevoking]       = useState(null)
  const [exampleTab, setExampleTab]   = useState('curl')

  const exampleKey = newKey?.raw_key || 'YOUR_API_KEY'

  const curlExample = `curl -X POST ${API_BASE}/api/v1/verify/single/ \\
  -H "X-API-Key: ${exampleKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "test@example.com"}'`

  const pythonExample = `import requests

response = requests.post(
    "${API_BASE}/api/v1/verify/single/",
    headers={"X-API-Key": "${exampleKey}"},
    json={"email": "test@example.com"},
)
print(response.json())`

  const jsExample = `const response = await fetch(
  "${API_BASE}/api/v1/verify/single/",
  {
    method: "POST",
    headers: {
      "X-API-Key": "${exampleKey}",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: "test@example.com" }),
  }
);
const data = await response.json();
console.log(data);`

  async function fetchKeys() {
    try {
      const { data } = await api.get('/auth/api-keys/')
      setKeys(data.results || data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchKeys() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setCreateError('')
    setNewKey(null)
    try {
      const { data } = await api.post('/auth/api-keys/', { name: newName.trim() })
      setNewKey(data)
      setNewName('')
      fetchKeys()
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create key.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm('Revoke this API key? Any integrations using it will stop working immediately.')) return
    setRevoking(id)
    try {
      await api.delete(`/auth/api-keys/${id}/`)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch {}
    finally { setRevoking(null) }
  }

  if (user?.plan === 'free') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">API Keys</h2>
          <p className="text-sm text-slate-400 mt-1">Verify emails programmatically via REST API.</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-600/15 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold text-base mb-1">API access requires a paid plan</h3>
          <p className="text-slate-400 text-sm mb-5">Upgrade to Starter ($20/mo) to generate API keys and access the REST API.</p>
          <button
            onClick={() => navigate('/dashboard/billing')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            View plans
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">API Keys</h2>
        <p className="text-sm text-slate-400 mt-1">
          Authenticate API requests using the <code className="text-slate-300 bg-white/5 px-1.5 py-0.5 rounded text-xs">X-API-Key</code> header.
        </p>
      </div>

      {/* New key revealed banner */}
      {newKey && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-400 font-semibold text-sm mb-1">API key created — copy it now</p>
              <p className="text-slate-400 text-xs mb-3">This is the only time the full key is shown. Store it securely.</p>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/30 border border-white/10">
                <code className="text-sm font-mono text-white flex-1 truncate">{newKey.raw_key}</code>
                <CopyButton text={newKey.raw_key} />
              </div>
            </div>
            <button onClick={() => setNewKey(null)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Create a new key</h3>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Key name (e.g. Production, My App)"
            maxLength={64}
            className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm whitespace-nowrap"
          >
            {creating ? 'Creating…' : '+ Create key'}
          </button>
        </form>
        {createError && <p className="text-red-400 text-xs mt-2">{createError}</p>}
      </div>

      {/* Keys list */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Active keys</h3>
          <span className="text-xs text-slate-500">{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="divide-y divide-white/5">
            {[0, 1].map((i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 rounded bg-white/8" />
                  <div className="h-3 w-56 rounded bg-white/5" />
                  <div className="h-3 w-24 rounded bg-white/5" />
                </div>
                <div className="h-7 w-16 rounded-lg bg-white/8" />
              </div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No API keys yet. Create one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {keys.map((k) => (
              <div key={k.id} className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">{k.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium shrink-0">Active</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <span className="text-xs font-mono text-slate-500 truncate">{k.prefix}{'•'.repeat(8)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
                    <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                    {k.last_used_at && (
                      <>
                        <span>·</span>
                        <span>Last used {new Date(k.last_used_at).toLocaleDateString()}</span>
                      </>
                    )}
                    {k.use_count > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-slate-400">{k.use_count.toLocaleString()} request{k.use_count !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  disabled={revoking === k.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50 shrink-0"
                >
                  {revoking === k.id ? 'Revoking…' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code examples */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/6">
          <h3 className="text-white font-semibold text-sm">Quick start</h3>
          <p className="text-xs text-slate-500 mt-0.5">Verify a single email via the API</p>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-white/6">
          {[['curl', 'cURL'], ['python', 'Python'], ['js', 'JavaScript']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setExampleTab(id)}
              className={`px-5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                exampleTab === id
                  ? 'border-brand-500 text-white bg-brand-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {exampleTab === 'curl'   && <CodeBlock code={curlExample}   language="bash" />}
          {exampleTab === 'python' && <CodeBlock code={pythonExample} language="python" />}
          {exampleTab === 'js'     && <CodeBlock code={jsExample}     language="javascript" />}
        </div>

        <div className="px-4 pb-4">
          <div className="rounded-xl bg-white/[0.02] border border-white/6 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Available endpoints</p>
            <div className="space-y-1.5">
              {[
                ['POST', '/api/v1/verify/single/', 'Verify a single email (1 credit)'],
                ['POST', '/api/v1/verify/bulk/',   'Upload a CSV for bulk verification'],
                ['GET',  '/api/v1/verify/jobs/',   'List all bulk jobs'],
                ['GET',  '/api/v1/verify/stats/',  'Get verification statistics'],
              ].map(([method, path, desc]) => (
                <div key={path} className="flex items-center gap-3">
                  <span className={`text-xs font-bold font-mono w-10 shrink-0 ${
                    method === 'GET' ? 'text-sky-400' : 'text-emerald-400'
                  }`}>{method}</span>
                  <code className="text-xs font-mono text-slate-300 flex-1 truncate">{path}</code>
                  <span className="text-xs text-slate-600 hidden sm:block">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
