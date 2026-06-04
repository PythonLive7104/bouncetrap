import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import api from '../../services/api'
import { getTool, TOOLS } from './toolsData'
import { getPostBySlug } from '../../content/blogPosts'

const SITE_URL = 'https://bouncetrap.net'

export default function ToolPage() {
  const { slug } = useParams()
  const tool = getTool(slug)
  const [domain, setDomain]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  if (!tool) return <Navigate to="/" replace />

  const url     = `${SITE_URL}/tools/${tool.slug}`
  const related = getPostBySlug(tool.relatedSlug)
  const others  = TOOLS.filter((t) => t.slug !== tool.slug)

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: tool.faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const appLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.h1,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url,
  }

  async function run(e) {
    e.preventDefault()
    const d = domain.trim().replace(/^https?:\/\//, '').split('/')[0]
    if (!d) return
    setLoading(true); setError(''); setResult(null)
    try {
      const { data } = await api.get(tool.endpoint(d))
      setResult(data)
    } catch (err) {
      setError(err.response?.status === 429
        ? 'Too many requests — please wait a minute and try again.'
        : (err.response?.data?.detail || 'Lookup failed. Check the domain and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>{tool.title}</title>
        <meta name="description" content={tool.metaDescription} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={tool.title} />
        <meta property="og:description" content={tool.metaDescription} />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify(appLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#0a0a14] font-sans text-slate-300">
        <header className="border-b border-white/5 bg-[#0a0a14]/90 backdrop-blur-md sticky top-0 z-50">
          <nav className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-white">
              <img src="/favicon.svg" alt="BounceTrap" className="w-7 h-7" />
              BounceTrap
            </Link>
            <Link to="/register" className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors">
              Start free
            </Link>
          </nav>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12">
          <nav className="text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-slate-300">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/tools" className="hover:text-slate-300">Free Tools</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-400">{tool.keyword}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Free Tool</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">{tool.h1}</h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">{tool.intro}</p>

          {/* Tool */}
          <form onSubmit={run} className="flex gap-3 mb-6">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={tool.placeholder}
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors"
            />
            <button type="submit" disabled={loading || !domain.trim()}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap">
              {loading ? 'Checking…' : 'Check'}
            </button>
          </form>

          {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">{error}</div>}
          {result && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 mb-10">
              {tool.renderResult(result)}
            </div>
          )}

          {/* CTA */}
          <div className="my-10 rounded-2xl border border-brand-800/30 bg-brand-950/30 p-6 text-center">
            <h2 className="text-lg font-bold text-white mb-2">Clean your whole email list free</h2>
            <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
              Authentication is only half the battle. Verify your list to stop bounces — get 100 free credits, no card required.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors">
              Start verifying free →
            </Link>
          </div>

          {/* About / SEO content */}
          {tool.about.map((s, i) => (
            <section key={i} className="mb-8">
              <h2 className="text-xl font-bold text-white mb-3">{s.h}</h2>
              <p className="text-slate-300 leading-relaxed">{s.p}</p>
            </section>
          ))}

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {tool.faqs.map((f, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                  <h3 className="text-white font-semibold text-sm mb-2">{f.q}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Cross-links */}
          <section className="border-t border-white/8 pt-8 grid sm:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-bold text-white mb-3">More free tools</h2>
              <ul className="space-y-2">
                {others.map((t) => (
                  <li key={t.slug}><Link to={`/tools/${t.slug}`} className="text-sm text-brand-400 hover:text-brand-300">{t.keyword} →</Link></li>
                ))}
              </ul>
            </div>
            {related && (
              <div>
                <h2 className="text-sm font-bold text-white mb-3">Related guide</h2>
                <Link to={`/blog/${related.slug}`} className="text-sm text-brand-400 hover:text-brand-300">{related.h1} →</Link>
              </div>
            )}
          </section>
        </main>

        <footer className="border-t border-white/5 py-10 px-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-white mb-3">
            <img src="/favicon.svg" alt="BounceTrap" className="w-6 h-6" />
            BounceTrap
          </Link>
          <p className="text-xs text-slate-600">© 2026 BounceTrap. All rights reserved.</p>
        </footer>
      </div>
    </>
  )
}
