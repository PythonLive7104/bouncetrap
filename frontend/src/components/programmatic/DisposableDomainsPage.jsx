import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

const SITE_URL = 'https://bouncetrap.net'

// Representative list of common disposable / temporary email domains.
const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'temp-mail.org', '10minutemail.com',
  'yopmail.com', 'sharklasers.com', 'guerrillamail.info', 'grr.la',
  'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net', 'spam4.me',
  'trashmail.com', 'trashmail.io', 'trashmail.me', 'dispostable.com',
  'fakeinbox.com', 'spamgourmet.com', 'mytemp.email', 'tempinbox.com',
  'tempr.email', 'discard.email', 'mailnull.com', 'spamspot.com',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org', 'sogetthis.com',
  'mailexpire.com', 'throwam.com', 'maildrop.cc', 'getairmail.com',
  '10minutemail.net', 'minutemail.com', 'tempmail.com', 'tempmail.net',
  'tempmail.org', 'temp-mail.ru', 'notsharingmy.info', 'meltmail.com',
  'incognitomail.org', 'mohmal.com', 'emailondeck.com', 'throwawaymail.com',
  'getnada.com', 'inboxkitten.com', 'mailcatch.com', 'mailnesia.com',
  'mintemail.com', 'mailtothis.com', 'tempemail.co', 'fakemailgenerator.com',
  'burnermail.io', 'guerrillamailblock.com', 'spambox.us', 'tempinbox.co',
  'jetable.org', 'no-spam.ws', 'spamfree24.org', 'maileater.com',
]

export default function DisposableDomainsPage() {
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(null)

  function check(e) {
    e.preventDefault()
    const d = input.trim().toLowerCase().replace(/^.*@/, '').replace(/^https?:\/\//, '').split('/')[0]
    if (!d) return
    setChecked({ domain: d, disposable: DISPOSABLE_DOMAINS.includes(d) })
  }

  const sorted = [...DISPOSABLE_DOMAINS].sort()

  const faqs = [
    { q: 'What is a disposable email address?', a: 'A disposable (or temporary) email address comes from a service that provides a short-lived inbox. People use them to sign up for trials, claim offers, or avoid giving a real address. They rarely convert and inflate your list.' },
    { q: 'Should I block disposable email addresses?', a: 'For signups and lead capture, yes. Disposable addresses skew your metrics, never convert, and are often used for abuse. Block them at the point of signup with verification.' },
    { q: 'How do I detect disposable emails on my list?', a: 'Run your list through email verification — BounceTrap flags every disposable address it finds, alongside invalid, role-based and catch-all addresses.' },
  ]

  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <Helmet>
        <title>Disposable Email Domains List + Free Checker | BounceTrap</title>
        <meta name="description" content="A list of common disposable and temporary email domains, plus a free checker to test any domain. Block throwaway addresses and keep your list clean." />
        <link rel="canonical" href={`${SITE_URL}/disposable-email-domains`} />
        <meta property="og:title" content="Disposable Email Domains List + Free Checker" />
        <meta property="og:url" content={`${SITE_URL}/disposable-email-domains`} />
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

        <main className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Resource</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">Disposable Email Domains List + Free Checker</h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            Disposable email addresses come from temporary-inbox services people use to dodge signups and grab trials. They never convert and pollute your list. Check any domain below, then browse the list of common offenders.
          </p>

          {/* Checker */}
          <form onSubmit={check} className="flex gap-3 mb-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a domain or email (e.g. mailinator.com)"
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-colors"
            />
            <button type="submit" disabled={!input.trim()}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm">
              Check
            </button>
          </form>
          {checked && (
            <div className={`rounded-xl border px-4 py-3 mb-10 text-sm font-medium ${
              checked.disposable
                ? 'bg-red-500/10 border-red-500/25 text-red-300'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
            }`}>
              {checked.disposable
                ? `⚠ ${checked.domain} is a known disposable email domain.`
                : `✓ ${checked.domain} is not in our disposable list. (Verify the full address to confirm it's deliverable.)`}
            </div>
          )}

          {/* CTA */}
          <div className="my-10 rounded-2xl border border-brand-800/30 bg-brand-950/30 p-6 text-center">
            <h2 className="text-lg font-bold text-white mb-2">Block disposable emails automatically</h2>
            <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
              BounceTrap flags disposable, invalid, role-based and catch-all addresses across your whole list — or in real time at signup via API. 100 free credits.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors">
              Start free →
            </Link>
          </div>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Common disposable email domains</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm font-mono text-slate-400 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              {sorted.map((d) => <span key={d} className="truncate">{d}</span>)}
            </div>
            <p className="text-xs text-slate-600 mt-3">This is a representative sample. New disposable domains appear constantly — BounceTrap checks against a continuously updated list of thousands.</p>
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
            <Link to="/blog/disposable-email-checker" className="text-sm text-brand-400 hover:text-brand-300">Read: Disposable Email Checker guide →</Link>
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
