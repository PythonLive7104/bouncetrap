import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuthStore } from '../../store/authStore'

/* ─── Data ─────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: '10-Step Hybrid Engine',
    desc: 'Syntax → Disposable → MX → multi-layer deep checks — authoritative results at every stage, no guesswork.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Real-Time Single Verify',
    desc: 'Structured result in under 5s — status, deliverability score, sub-status, ESP detection, and full flag set.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: 'Bulk CSV Processing',
    desc: 'Upload lists up to 500k rows. Async Celery-powered jobs with real-time progress and CSV result download.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Deliverability Score 0–100',
    desc: 'Weighted score factoring SMTP response, catch-all risk, role-based flags, disposable status, and free provider signals.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'Developer REST API',
    desc: 'Versioned API with API key auth, OpenAPI schema, and code snippets for Python, JavaScript, PHP, and cURL.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Deliverability Diagnostics',
    desc: 'SPF, DMARC, DKIM, and MX record checker with domain health grading from A+ down to F.',
  },
]

const PAID_PLANS = [
  {
    name: 'Starter',
    monthlyPrice: 20,
    monthlyCredits: 25_000,
    features: ['25,000 credits / month', 'Bulk up to 5,000 rows', 'Full API access', 'CSV download', 'Email support'],
    highlight: false,
  },
  {
    name: 'Growth',
    monthlyPrice: 70,
    monthlyCredits: 100_000,
    features: ['100,000 credits / month', 'Bulk up to 50,000 rows', 'Deliverability tools', 'Priority support', 'All Starter features'],
    highlight: true,
  },
  {
    name: 'Pro',
    monthlyPrice: 110,
    monthlyCredits: 200_000,
    features: ['200,000 credits / month', 'Bulk up to 500,000 rows', 'Dedicated support', 'All Growth features', 'Custom integrations'],
    highlight: false,
  },
]

const STATS = [
  { value: '97%+', label: 'Accuracy rate' },
  { value: '70%+', label: 'Resolved locally' },
  { value: '<5s',  label: 'p95 verify time' },
  { value: '99.9%', label: 'Uptime SLA' },
]

const PIPELINE_STEPS = [
  ['1',  'Syntax validation',    'RFC 5321 regex check',               false],
  ['2',  'Disposable detection', '50k+ domain blocklist',              false],
  ['3',  'Role-based detection', 'Prefix pattern matching',            false],
  ['4',  'Free provider check',  'Known provider lookup',              false],
  ['5',  'MX record lookup',     'Live DNS query',                     false],
  ['6',  'Mailbox reachability', 'Live deliverability probe',          true ],
  ['7',  'Catch-all detection',  'Domain-level acceptance check',      true ],
  ['8',  'ESP identification',   'Sender infrastructure lookup',       false],
  ['9',  'Deep validation',      'Authoritative mailbox check',        true ],
  ['10', 'Score calculation',    'Weighted 0–100 deliverability',      false],
]

const FAQS = [
  {
    q: "How accurate is BounceTrap's email verification?",
    a: "BounceTrap achieves 97%+ accuracy by combining fast local checks — syntax, MX, disposable blocklist — with multi-layer deep validation in the final steps. Every email receives a definitive result with no guesswork.",
  },
  {
    q: "What file formats does bulk upload support?",
    a: "Bulk upload supports CSV and TXT files. For CSV you can specify the column containing email addresses. For TXT files, one email per line is expected. Files up to 500,000 rows are supported on the Pro plan.",
  },
  {
    q: "Do I need a credit card to get started?",
    a: "No. Sign up for free and receive 100 verification credits immediately — no credit card required. Upgrade at any time when you need more capacity.",
  },
  {
    q: "How does API authentication work?",
    a: "API authentication uses the X-API-Key request header. Generate keys from your dashboard (Starter plan or above). Keys are stored as cryptographic hashes — the plaintext key is shown only once at creation time.",
  },
  {
    q: "What is a catch-all domain and why does it matter?",
    a: 'A catch-all domain accepts all incoming emails regardless of whether the individual mailbox exists. BounceTrap detects catch-all domains and marks those addresses as "risky" rather than "valid" to protect your sender reputation.',
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes. Cancel or downgrade at any time from your billing page — no lock-in contracts or cancellation fees. Your credit balance never expires: unused credits are preserved when your subscription lapses and become available again the moment you renew.",
  },
]

function fmt(n) {
  return n >= 1_000_000
    ? (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M'
    : n.toLocaleString()
}

/* ─── FAQ item ─────────────────────────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/6 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-white font-medium group-hover:text-brand-300 transition-colors">{q}</span>
        <span className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-45' : ''}`}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      {open && (
        <p className="text-slate-400 text-sm leading-relaxed pb-5">{a}</p>
      )}
    </div>
  )
}

/* ─── API Section ──────────────────────────────────────────────────────── */
const CODE_TABS = {
  curl: {
    label: 'cURL',
    request: `curl -X POST \\
  https://bouncetrap.io/api/v1/verify/single/ \\
  -H "X-API-Key: bt_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "jane@acme.com"}'`,
  },
  python: {
    label: 'Python',
    request: `import requests

res = requests.post(
    "https://bouncetrap.io/api/v1/verify/single/",
    headers={"X-API-Key": "bt_live_xxxxxxxxxxxx"},
    json={"email": "jane@acme.com"},
)
data = res.json()
print(data["status"], data["score"])`,
  },
  js: {
    label: 'JavaScript',
    request: `const res = await fetch(
  "https://bouncetrap.io/api/v1/verify/single/",
  {
    method: "POST",
    headers: {
      "X-API-Key": "bt_live_xxxxxxxxxxxx",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: "jane@acme.com" }),
  }
);
const data = await res.json();`,
  },
}

const ENDPOINTS = [
  { method: 'POST', path: '/verify/single/', desc: 'Verify one email · 1 credit',      color: 'text-emerald-400' },
  { method: 'POST', path: '/verify/bulk/',   desc: 'Upload CSV for async processing',   color: 'text-emerald-400' },
  { method: 'GET',  path: '/verify/jobs/',   desc: 'List & poll bulk job status',       color: 'text-sky-400' },
  { method: 'GET',  path: '/verify/stats/',  desc: 'Aggregated verification stats',     color: 'text-sky-400' },
]

function ApiSection({ ctaTo }) {
  const [tab, setTab] = useState('curl')
  const current = CODE_TABS[tab]

  return (
    <section id="api" className="py-24 px-6" aria-labelledby="api-heading">
      <div className="max-w-6xl mx-auto">
        {/* Top label + heading centered */}
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Developer API</p>
          <h2 id="api-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
            One call away from clean data
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            REST API with a consistent JSON schema. Authenticate with a single header. No OAuth, no SDKs required.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Left — feature list + endpoints */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key traits */}
            <div className="space-y-4">
              {[
                { icon: '⚡', title: 'Single header auth', desc: 'Pass your API key in X-API-Key — no OAuth, no tokens to refresh.' },
                { icon: '📦', title: 'Typed JSON responses', desc: 'Every field is documented. status, score, esp, flags — all in one response.' },
                { icon: '🔄', title: 'Bulk job polling', desc: 'Submit a CSV, get a job ID back. Poll GET /jobs/{id}/ until done.' },
                { icon: '🔒', title: 'Versioned & stable', desc: 'All endpoints live at /api/v1/. No surprise breaking changes.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{icon}</span>
                  <div>
                    <p className="text-white text-sm font-semibold">{title}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Endpoints */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
              <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-white/6">
                Endpoints
              </p>
              <div className="divide-y divide-white/5">
                {ENDPOINTS.map(({ method, path, desc, color }) => (
                  <div key={path} className="flex items-center gap-3 px-4 py-3">
                    <span className={`text-xs font-bold font-mono w-10 shrink-0 ${color}`}>{method}</span>
                    <div className="min-w-0">
                      <code className="text-xs font-mono text-slate-300">/api/v1{path}</code>
                      <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to={ctaTo}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Get your API key free →
            </Link>
          </div>

          {/* Right — interactive code panel */}
          <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#0d0d1f] overflow-hidden shadow-2xl">
            {/* Mac dots + tab switcher */}
            <div className="flex items-center gap-0 border-b border-white/6 bg-white/[0.025]">
              <div className="flex items-center gap-1.5 px-4 py-3 border-r border-white/6">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              {Object.entries(CODE_TABS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
                    tab === key
                      ? 'border-brand-500 text-white bg-brand-500/5'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Request block */}
            <div className="px-1 pt-1">
              <div className="px-3 py-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">POST</span>
                <span className="text-xs font-mono text-slate-500">/api/v1/verify/single/</span>
              </div>
              <pre className="px-5 pb-5 text-sm font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre">{current.request}</pre>
            </div>

            {/* Response block */}
            <div className="border-t border-white/6 bg-white/[0.015]">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5">
                <span className="text-xs font-semibold text-slate-500">Response</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">200 OK</span>
              </div>
              <div className="p-5 font-mono text-xs leading-loose">
                <span className="text-slate-600">{'{'}</span>{'\n'}
                {'  '}<span className="text-slate-400">"email":</span>      <span className="text-amber-300">"jane@acme.com"</span><span className="text-slate-600">,</span>{'\n'}
                {'  '}<span className="text-slate-400">"status":</span>     <span className="text-emerald-400 font-bold">"valid"</span><span className="text-slate-600">,</span>{'\n'}
                {'  '}<span className="text-slate-400">"score":</span>      <span className="text-brand-300">94</span><span className="text-slate-600">,</span>{'\n'}
                {'  '}<span className="text-slate-400">"esp":</span>        <span className="text-violet-400">"Google"</span><span className="text-slate-600">,</span>{'\n'}
                {'  '}<span className="text-slate-400">"mx_found":</span>   <span className="text-sky-400">true</span><span className="text-slate-600">,</span>{'\n'}
                {'  '}<span className="text-slate-400">"is_catch_all":</span> <span className="text-slate-500">false</span><span className="text-slate-600">,</span>{'\n'}
                {'  '}<span className="text-slate-400">"disposable":</span> <span className="text-slate-500">false</span><span className="text-slate-600">,</span>{'\n'}
                {'  '}<span className="text-slate-400">"credits_remaining":</span> <span className="text-brand-300">24997</span>{'\n'}
                <span className="text-slate-600">{'}'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Component ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [billing, setBilling] = useState('monthly')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const ctaTo    = isAuthenticated ? '/dashboard' : '/register'
  const ctaLabel = isAuthenticated ? 'Go to Dashboard' : 'Start verifying free'
  const isYearly = billing === 'yearly'

  return (
    <>
      <Helmet>
        <title>BounceTrap — Email Verification API & Bulk List Cleaning</title>
        <meta name="description" content="Verify email addresses in real time with BounceTrap's 10-step hybrid engine — syntax, MX, disposable detection, and authoritative API checks. Bulk CSV upload, REST API, and deliverability tools. Start free." />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a14] text-slate-200 font-sans">

        {/* ── Navbar ──────────────────────────────────────────────────── */}
        <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a14]/90 backdrop-blur-md">
          <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between" aria-label="Main navigation">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-white" aria-label="BounceTrap home">
              <img src="/favicon.svg" alt="" aria-hidden="true" className="w-8 h-8" />
              BounceTrap
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[['Features', '#features'], ['Pricing', '#pricing'], ['API', '#api'], ['FAQ', '#faq']].map(([l, h]) => (
                <a key={l} href={h} className="text-sm text-slate-400 hover:text-white transition-colors">{l}</a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link to="/dashboard" className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 hidden sm:block">
                    Log in
                  </Link>
                  <Link to="/register" className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors hidden sm:block">
                    Get started free
                  </Link>
                </>
              )}
              {/* Hamburger — mobile only */}
              <button
                className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </nav>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/5 bg-[#0a0a14]/95 px-6 py-4 space-y-1">
              {[['Features', '#features'], ['Pricing', '#pricing'], ['API', '#api'], ['FAQ', '#faq']].map(([l, h]) => (
                <a
                  key={l}
                  href={h}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  {l}
                </a>
              ))}
              <div className="pt-3 border-t border-white/6 flex flex-col gap-2">
                {isAuthenticated ? (
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg text-sm transition-colors">
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 border border-white/10 text-slate-300 hover:text-white rounded-lg text-sm transition-colors">
                      Log in
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg text-sm transition-colors">
                      Get started free
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </header>

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative pt-36 pb-24 px-6 overflow-hidden" aria-labelledby="hero-heading">
          {/* Background glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-brand-600/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-violet-700/8 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
          <div className="absolute top-64 right-1/4 w-[200px] h-[200px] bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />

          <div className="relative max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-400 bg-brand-950/80 border border-brand-800/50 px-3 py-1.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              10-step hybrid engine · 70%+ resolved locally · no credit card needed
            </div>

            <h1 id="hero-heading" className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.06] tracking-tight mb-6">
              Stop sending to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-violet-400 to-brand-300">
                bad emails
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
              BounceTrap verifies every address through a 10-step pipeline — syntax, DNS, disposable detection,
              and authoritative API checks — protecting your sender reputation before you hit send.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                to={ctaTo}
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-900/40 hover:shadow-brand-600/25 hover:-translate-y-0.5 text-base"
              >
                {ctaLabel}
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto px-8 py-3.5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-medium rounded-xl transition-all text-base"
              >
                See how it works ↓
              </a>
            </div>

            <p className="text-xs text-slate-600">
              Free plan includes 100 credits · No credit card required · Setup in under 2 minutes
            </p>
          </div>

          {/* Hero terminal card */}
          <div className="relative max-w-2xl mx-auto mt-16">
            <div className="absolute inset-0 bg-brand-600/10 blur-2xl rounded-3xl" aria-hidden="true" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0d0d1f] shadow-2xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/6 bg-white/[0.02]">
                <span className="w-3 h-3 rounded-full bg-red-500/70" aria-hidden="true" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" aria-hidden="true" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" aria-hidden="true" />
                <span className="ml-3 text-xs text-slate-500 font-mono">POST /api/v1/verify/single/  →  200 OK</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/5">
                <div className="p-5 font-mono text-sm space-y-1.5">
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-sans font-semibold mb-3">Request</p>
                  <div><span className="text-slate-500">"email":</span> <span className="text-amber-300">"jane@acme.com"</span></div>
                </div>
                <div className="p-5 font-mono text-sm space-y-1.5">
                  <p className="text-xs text-slate-600 uppercase tracking-wide font-sans font-semibold mb-3">Response</p>
                  <div><span className="text-slate-500">status</span>       <span className="text-emerald-400 font-bold">valid</span></div>
                  <div><span className="text-slate-500">score</span>        <span className="text-brand-300">94</span></div>
                  <div><span className="text-slate-500">esp</span>          <span className="text-violet-400">Google</span></div>
                  <div><span className="text-slate-500">mx_found</span>     <span className="text-emerald-400">true</span></div>
                  <div><span className="text-slate-500">smtp_valid</span>   <span className="text-emerald-400">true</span></div>
                  <div><span className="text-slate-500">disposable</span>   <span className="text-slate-500">false</span></div>
                  <div><span className="text-slate-500">catch_all</span>    <span className="text-slate-500">false</span></div>
                  <div><span className="text-slate-500">role_based</span>   <span className="text-slate-500">false</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Social proof stats bar ───────────────────────────────────── */}
        <section className="py-14 px-6 border-y border-white/5 bg-white/[0.01]" aria-label="Key statistics">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl md:text-4xl font-extrabold text-white mb-1">{value}</div>
                <div className="text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────── */}
        <section id="features" className="py-24 px-6" aria-labelledby="features-heading">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Features</p>
              <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything you need to keep lists clean
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                From a single address check to 500k-row bulk jobs — BounceTrap handles it all with a transparent, multi-layer engine.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="group p-6 rounded-2xl bg-white/[0.03] border border-white/7 hover:border-brand-700/50 hover:bg-brand-950/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-900/50 text-brand-400 group-hover:bg-brand-800/60 group-hover:scale-105 flex items-center justify-center mb-4 transition-all">
                    {icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pipeline ────────────────────────────────────────────────── */}
        <section className="py-20 px-6 bg-gradient-to-b from-transparent via-brand-950/10 to-transparent" aria-labelledby="pipeline-heading">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">How it works</p>
              <h2 id="pipeline-heading" className="text-3xl font-bold text-white mb-4">10-step hybrid pipeline</h2>
              <p className="text-slate-400 max-w-lg mx-auto">
                Each email passes through every layer in order. The deep verification step runs last to provide an authoritative result.
              </p>
            </div>

            <div className="space-y-2">
              {PIPELINE_STEPS.map(([num, title, detail, isDeep]) => (
                <div
                  key={num}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-colors ${
                    isDeep
                      ? 'bg-violet-500/8 border-violet-500/20'
                      : 'bg-white/[0.025] border-white/6 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDeep ? 'bg-violet-500/20 text-violet-400' : 'bg-brand-900/60 text-brand-400'
                  }`}>
                    {num}
                  </span>
                  <span className={`font-medium text-sm flex-1 ${isDeep ? 'text-violet-200' : 'text-slate-200'}`}>{title}</span>
                  <span className="text-slate-600 text-xs hidden sm:block">{detail}</span>
                  {isDeep && (
                    <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 whitespace-nowrap">
                      authoritative
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── API section ─────────────────────────────────────────────── */}
        <ApiSection ctaTo={ctaTo} />

        {/* ── Pricing ─────────────────────────────────────────────────── */}
        <section id="pricing" className="py-24 px-6 bg-gradient-to-b from-transparent via-brand-950/8 to-transparent" aria-labelledby="pricing-heading">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Pricing</p>
              <h2 id="pricing-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
              <p className="text-slate-400 text-lg">Start free. Scale when you need to. No hidden fees.</p>
            </div>

            {/* Billing toggle */}
            <div className="flex items-center justify-center mb-12" role="group" aria-label="Billing period">
              <div className="flex items-center bg-white/[0.04] border border-white/8 rounded-2xl p-1 gap-1">
                <button
                  onClick={() => setBilling('monthly')}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    !isYearly ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  aria-pressed={!isYearly}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling('yearly')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isYearly ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  aria-pressed={isYearly}
                >
                  Yearly
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
                    isYearly
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    2 months free
                  </span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Free */}
              <div className="relative p-6 rounded-2xl flex flex-col bg-white/[0.03] border border-white/8">
                <p className="text-sm font-semibold text-slate-400 mb-3">Free</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                </div>
                <p className="text-sm text-slate-500 mb-6">100 credits on signup</p>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {['Single email verify', 'Dashboard access', 'Verification history'].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={ctaTo} className="w-full text-center py-2.5 rounded-xl font-semibold text-sm border border-white/10 text-white hover:bg-white/5 transition-all">
                  {isAuthenticated ? 'Go to Dashboard' : 'Get started'}
                </Link>
              </div>

              {/* Paid plans */}
              {PAID_PLANS.map(({ name, monthlyPrice, monthlyCredits, features, highlight }) => {
                const yearlyTotal   = monthlyPrice * 10
                const yearlyCredits = monthlyCredits * 12
                const displayPrice   = isYearly ? yearlyTotal   : monthlyPrice
                const displayCredits = isYearly ? yearlyCredits : monthlyCredits
                return (
                  <div
                    key={name}
                    className={`relative p-6 rounded-2xl flex flex-col transition-all ${
                      highlight
                        ? 'bg-brand-600 border-2 border-brand-400 shadow-2xl shadow-brand-900/50'
                        : 'bg-white/[0.03] border border-white/8 hover:border-white/15'
                    }`}
                  >
                    {highlight && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold bg-emerald-500 text-white px-3 py-1 rounded-full whitespace-nowrap">
                        Most Popular
                      </span>
                    )}
                    <p className={`text-sm font-semibold mb-3 ${highlight ? 'text-brand-200' : 'text-slate-400'}`}>{name}</p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-extrabold text-white">${displayPrice}</span>
                      <span className={`pb-1 text-sm ${highlight ? 'text-brand-200' : 'text-slate-400'}`}>
                        {isYearly ? '/year' : '/mo'}
                      </span>
                    </div>
                    <p className={`text-sm mb-1 ${highlight ? 'text-brand-200' : 'text-slate-500'}`}>
                      {fmt(displayCredits)} credits{isYearly ? '/year' : '/mo'}
                    </p>
                    {isYearly && (
                      <span className={`inline-flex items-center gap-1 mb-3 text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${
                        highlight
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Save ${(monthlyPrice * 2).toLocaleString()} / year
                      </span>
                    )}
                    {!isYearly && <div className="mb-3" />}
                    <ul className="space-y-2.5 flex-1 mb-6">
                      {features.map((f) => (
                        <li key={f} className={`flex items-start gap-2 text-sm ${highlight ? 'text-brand-100' : 'text-slate-300'}`}>
                          <svg className={`w-4 h-4 mt-0.5 shrink-0 ${highlight ? 'text-emerald-300' : 'text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={ctaTo}
                      className={`w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        highlight
                          ? 'bg-white text-brand-700 hover:bg-slate-100'
                          : 'border border-white/10 text-white hover:bg-white/5'
                      }`}
                    >
                      Get started
                    </Link>
                  </div>
                )
              })}
            </div>

            {isYearly && (
              <p className="text-center text-sm text-slate-500 mt-6">
                Yearly plans include{' '}
                <span className="text-emerald-400 font-semibold">2 months free</span>
                {' '}— pay for 10, get 12 months of credits.
              </p>
            )}

            {/* Credits vs subscription clarification */}
            <div className="mt-6 mx-auto max-w-2xl rounded-2xl bg-white/[0.03] border border-white/8 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm">
              <div className="flex items-center gap-2 shrink-0">
                <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-semibold">How credits work</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                <span className="text-white font-medium">Credits never expire</span> — your balance carries over when you renew.
                What expires is your <span className="text-white font-medium">30-day usage window</span>: credits can only be spent while your subscription is active. Renew any time to unlock your balance again.
              </p>
            </div>

            <p className="text-center text-sm text-slate-600 mt-4">
              All plans include a 7-day money-back guarantee · Cancel any time · No lock-in contracts
            </p>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section id="faq" className="py-24 px-6" aria-labelledby="faq-heading">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">FAQ</p>
              <h2 id="faq-heading" className="text-3xl font-bold text-white mb-4">Common questions</h2>
              <p className="text-slate-400">Everything you need to know before getting started.</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-6">
              {FAQS.map(({ q, a }) => (
                <FaqItem key={q} q={q} a={a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────── */}
        <section className="py-20 px-6" aria-labelledby="cta-heading">
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 to-violet-900/20 rounded-3xl blur-xl" aria-hidden="true" />
            <div className="relative rounded-3xl bg-gradient-to-br from-brand-900/50 to-violet-900/25 border border-brand-700/30 p-12">
              <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to clean your list?
              </h2>
              <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
                Sign up in seconds. 100 free credits, no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to={ctaTo}
                  className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-900/50 hover:-translate-y-0.5 text-base"
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Create free account'}
                </Link>
                <a
                  href="#pricing"
                  className="w-full sm:w-auto px-8 py-3.5 border border-white/15 hover:border-white/25 text-slate-300 hover:text-white font-medium rounded-xl transition-all text-base"
                >
                  View pricing
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 py-14 px-6" role="contentinfo">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-10 mb-10">
              {/* Brand */}
              <div className="md:col-span-1">
                <Link to="/" className="flex items-center gap-2.5 font-bold text-white mb-3">
                  <img src="/favicon.svg" alt="BounceTrap" className="w-7 h-7" />
                  BounceTrap
                </Link>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Email verification API for developers and marketers who care about deliverability.
                </p>
              </div>

              {/* Product links */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Product</p>
                <ul className="space-y-2.5">
                  {[['Features', '#features'], ['Pricing', '#pricing'], ['API docs', '#api'], ['Changelog', '#']].map(([l, h]) => (
                    <li key={l}><a href={h} className="text-sm text-slate-400 hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>

              {/* Developers */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Developers</p>
                <ul className="space-y-2.5">
                  {[['API Reference', '#api'], ['Authentication', '#api'], ['Rate limits', '#faq'], ['OpenAPI schema', '#']].map(([l, h]) => (
                    <li key={l}><a href={h} className="text-sm text-slate-400 hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Company</p>
                <ul className="space-y-2.5">
                  {[['About', '#'], ['Blog', '#'], ['Privacy Policy', '#'], ['Terms of Service', '#'], ['Contact', '#']].map(([l, h]) => (
                    <li key={l}><a href={h} className="text-sm text-slate-400 hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-600">© 2026 BounceTrap. All rights reserved.</p>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                  All systems operational
                </span>
                <span>·</span>
                <span>v1.0</span>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
