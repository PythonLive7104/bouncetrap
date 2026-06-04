import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getProvider, PROVIDERS } from '../../content/providers'

const SITE_URL = 'https://bouncetrap.net'

export default function ProviderPage() {
  const { slug } = useParams()
  const p = getProvider(slug)
  if (!p) return <Navigate to="/" replace />

  const url    = `${SITE_URL}/verify-email/${p.slug}`
  const others = PROVIDERS.filter((x) => x.slug !== p.slug).slice(0, 8)

  const faqs = [
    { q: `How do I verify a ${p.name} email address?`, a: `Enter the address into BounceTrap's verifier. It checks syntax, confirms the ${p.name} mail servers (${p.mx}) and performs an SMTP check to confirm the mailbox — without sending an email. You get a valid / invalid / risky verdict in seconds.` },
    { q: `Can ${p.name} addresses be verified accurately?`, a: p.catchAll
        ? `${p.name} can behave as catch-all in some configurations, so individual mailboxes may be flagged "risky". BounceTrap clearly labels catch-all results so you can decide how to handle them.`
        : `Yes — ${p.name} can generally be verified reliably via SMTP. BounceTrap reaches over 98% accuracy on deliverable addresses.` },
    { q: `Does verifying notify the ${p.name} user?`, a: `No. Verification stops before any message is delivered, so the ${p.name} mailbox owner is never contacted.` },
  ]

  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <Helmet>
        <title>{`How to Verify a ${p.name} Email Address (Free) | BounceTrap`}</title>
        <meta name="description" content={`Verify ${p.name} email addresses accurately. Check if a ${p.name} address is valid and deliverable without sending an email. Start free with 100 credits.`} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`How to Verify a ${p.name} Email Address`} />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#0a0a14] font-sans text-slate-300">
        <header className="border-b border-white/5 bg-[#0a0a14]/90 backdrop-blur-md sticky top-0 z-50">
          <nav className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-white">
              <img src="/favicon.svg" alt="BounceTrap" className="w-7 h-7" />
              BounceTrap
            </Link>
            <Link to="/register" className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors">Start free</Link>
          </nav>
        </header>

        <article className="max-w-3xl mx-auto px-6 py-12">
          <nav className="text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-slate-300">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/blog/email-verification-tool" className="hover:text-slate-300">Verify Email</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-400">{p.name}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Verify {p.name}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">How to Verify a {p.name} Email Address</h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            Need to check whether a {p.name} address is real and deliverable? Here's how {p.name} verification works, what makes it unique, and how to verify {p.name} addresses without sending an email.
          </p>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 mb-10">
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-slate-500">Provider</dt><dd className="text-white font-medium">{p.name}</dd></div>
              <div><dt className="text-slate-500">Domains</dt><dd className="text-white font-medium">{p.domains.join(', ')}</dd></div>
              <div><dt className="text-slate-500">Mail servers (MX)</dt><dd className="text-white font-medium">{p.mx}</dd></div>
              <div><dt className="text-slate-500">Catch-all</dt><dd className="text-white font-medium">{p.catchAll ? 'Sometimes' : 'No (typically)'}</dd></div>
            </dl>
          </div>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-3">What makes {p.name} verification unique</h2>
            <p className="text-slate-300 leading-relaxed">{p.quirks}</p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-3">Tips for {p.name} addresses</h2>
            <ul className="space-y-2.5">
              {p.tips.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-slate-300">
                  <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <div className="my-10 rounded-2xl border border-brand-800/30 bg-brand-950/30 p-6 text-center">
            <h2 className="text-lg font-bold text-white mb-2">Verify {p.name} addresses free</h2>
            <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
              Check one address or upload a whole list. Get 100 free credits on signup — no card, credits never expire.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors">
              Start verifying free →
            </Link>
          </div>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-3">How {p.name} verification works</h2>
            <p className="text-slate-300 leading-relaxed mb-3">BounceTrap verifies a {p.name} address through a multi-step process that never sends an actual email:</p>
            <ol className="space-y-2 text-slate-300 list-decimal list-inside">
              <li>Validates the address format</li>
              <li>Confirms the {p.name} mail servers ({p.mx}) accept mail</li>
              <li>Runs an SMTP check to confirm the specific mailbox</li>
              <li>Flags disposable, role-based and catch-all addresses</li>
              <li>Returns a verdict and a 0–100 deliverability score</li>
            </ol>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                  <h3 className="text-white font-semibold text-sm mb-2">{f.q}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-white/8 pt-8">
            <h2 className="text-sm font-bold text-white mb-3">Verify other providers</h2>
            <div className="flex flex-wrap gap-2">
              {others.map((x) => (
                <Link key={x.slug} to={`/verify-email/${x.slug}`} className="text-sm text-brand-400 hover:text-brand-300 px-3 py-1.5 rounded-lg border border-white/8 hover:border-brand-500/40 transition-colors">
                  {x.name}
                </Link>
              ))}
            </div>
          </section>
        </article>

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
