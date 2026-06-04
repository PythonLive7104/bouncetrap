import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getIndustry, INDUSTRIES } from '../../content/industries'

const SITE_URL = 'https://bouncetrap.net'

export default function IndustryPage() {
  const { slug } = useParams()
  const ind = getIndustry(slug)
  if (!ind) return <Navigate to="/" replace />

  const url    = `${SITE_URL}/email-verification-for/${ind.slug}`
  const others = INDUSTRIES.filter((i) => i.slug !== ind.slug)

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: ind.title,
    description: ind.metaDescription,
    url,
  }

  return (
    <>
      <Helmet>
        <title>{ind.title}</title>
        <meta name="description" content={ind.metaDescription} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ind.title} />
        <meta property="og:description" content={ind.metaDescription} />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify(ld)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#0a0a14] font-sans text-slate-300">
        <header className="border-b border-white/5 bg-[#0a0a14]/90 backdrop-blur-md sticky top-0 z-50">
          <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-white">
              <img src="/favicon.svg" alt="BounceTrap" className="w-7 h-7" />
              BounceTrap
            </Link>
            <Link to="/register" className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors">
              Start free
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Email Verification for {ind.name}</p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-5">{ind.hero}</h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">{ind.subhero}</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors">
            Start free — 100 credits →
          </Link>
          <p className="text-xs text-slate-600 mt-3">No card required · Credits never expire</p>
        </section>

        <main className="max-w-5xl mx-auto px-6 pb-16">
          {/* Pain points */}
          <section className="max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">The problem {ind.name.toLowerCase()} face</h2>
            <div className="space-y-3">
              {ind.painPoints.map((p, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="text-slate-300 text-sm">{p}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Benefits */}
          <section className="mb-14">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">How BounceTrap helps</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {ind.benefits.map((b, i) => (
                <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
                  <div className="w-10 h-10 rounded-xl bg-brand-600/15 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold mb-2">{b.h}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{b.p}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Use case */}
          <section className="max-w-3xl mx-auto mb-14 rounded-2xl border border-brand-800/30 bg-brand-950/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-400 mb-2">In practice</p>
            <p className="text-slate-200 leading-relaxed">{ind.useCase}</p>
          </section>

          {/* CTA */}
          <section className="max-w-3xl mx-auto text-center mb-14">
            <h2 className="text-2xl font-bold text-white mb-3">Start cleaning your list today</h2>
            <p className="text-slate-400 mb-6">100 free credits, no card required. Credits never expire.</p>
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors">
              Get started free →
            </Link>
          </section>

          {/* Other industries */}
          <section className="border-t border-white/8 pt-8">
            <h2 className="text-sm font-bold text-white mb-4 text-center">Email verification for other industries</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {others.map((i) => (
                <Link key={i.slug} to={`/email-verification-for/${i.slug}`} className="text-sm text-brand-400 hover:text-brand-300 px-3 py-1.5 rounded-lg border border-white/8 hover:border-brand-500/40 transition-colors">
                  {i.name}
                </Link>
              ))}
            </div>
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
