import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { TOOLS } from './toolsData'

const SITE_URL = 'https://bouncetrap.net'

export default function ToolsIndexPage() {
  return (
    <>
      <Helmet>
        <title>Free Email Deliverability Tools | BounceTrap</title>
        <meta name="description" content="Free tools to check SPF, DKIM, DMARC, MX records and email blacklists. No signup required — diagnose your email setup in seconds." />
        <link rel="canonical" href={`${SITE_URL}/tools`} />
        <meta property="og:title" content="Free Email Deliverability Tools | BounceTrap" />
        <meta property="og:description" content="Check SPF, DKIM, DMARC, MX records and blacklists for free." />
        <meta property="og:url" content={`${SITE_URL}/tools`} />
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

        <main className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Free Tools</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Free Email Deliverability Tools</h1>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Diagnose your email setup in seconds. Check authentication, mail servers and blacklists — no signup required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((t) => (
              <Link key={t.slug} to={`/tools/${t.slug}`}
                className="group rounded-2xl border border-white/8 bg-white/[0.02] p-6 hover:border-brand-500/40 hover:bg-white/[0.04] transition-colors">
                <h2 className="text-lg font-bold text-white mb-2 group-hover:text-brand-200 transition-colors">{t.keyword}</h2>
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{t.metaDescription}</p>
                <span className="text-xs text-brand-400 mt-3 inline-block">Open tool →</span>
              </Link>
            ))}
          </div>
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
