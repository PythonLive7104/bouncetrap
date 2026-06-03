import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { BLOG_POSTS } from '../../content/blogPosts'

const SITE_URL = 'https://bouncetrap.net'

export default function BlogIndexPage() {
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: BLOG_POSTS.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/blog/${p.slug}`,
      name: p.h1,
    })),
  }

  return (
    <>
      <Helmet>
        <title>Blog — Email Verification & Deliverability Guides | BounceTrap</title>
        <meta name="description" content="Guides on email verification, list cleaning, bounce checking, SMTP validation and deliverability. Learn how to keep your emails landing in the inbox." />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <meta property="og:title" content="BounceTrap Blog — Email Verification & Deliverability Guides" />
        <meta property="og:description" content="Guides on email verification, list cleaning, bounce checking, SMTP validation and deliverability." />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <script type="application/ld+json">{JSON.stringify(itemListLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#0a0a14] font-sans text-slate-300">
        {/* Header */}
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
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Blog</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Email Verification & Deliverability Guides</h1>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Everything you need to keep your list clean, your bounces low and your campaigns landing in the inbox.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {BLOG_POSTS.map((p) => (
              <Link
                key={p.slug}
                to={`/blog/${p.slug}`}
                className="group rounded-2xl border border-white/8 bg-white/[0.02] p-6 hover:border-brand-500/40 hover:bg-white/[0.04] transition-colors"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-400 mb-2">{p.keyword}</p>
                <h2 className="text-lg font-bold text-white mb-2 group-hover:text-brand-200 transition-colors">{p.h1}</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-3 line-clamp-3">{p.intro}</p>
                <span className="text-xs text-slate-500">{p.readTime} · Read guide →</span>
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
