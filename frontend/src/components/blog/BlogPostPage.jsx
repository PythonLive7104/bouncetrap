import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getPostBySlug, BLOG_POSTS } from '../../content/blogPosts'

const SITE_URL = 'https://bouncetrap.net'

export default function BlogPostPage() {
  const { slug } = useParams()
  const post = getPostBySlug(slug)

  if (!post) return <Navigate to="/blog" replace />

  const url      = `${SITE_URL}/blog/${post.slug}`
  const related  = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3)

  // JSON-LD structured data — Article + FAQPage for rich results
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.h1,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { '@type': 'Organization', name: 'BounceTrap' },
    publisher: {
      '@type': 'Organization',
      name: 'BounceTrap',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.keyword, item: url },
    ],
  }

  return (
    <>
      <Helmet>
        <title>{post.title}</title>
        <meta name="description" content={post.metaDescription} />
        <link rel="canonical" href={url} />
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="BounceTrap" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.metaDescription} />
        <script type="application/ld+json">{JSON.stringify(articleLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-[#0a0a14] font-sans text-slate-300">
        {/* Header */}
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

        <article className="max-w-3xl mx-auto px-6 py-12">
          {/* Breadcrumb */}
          <nav className="text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-slate-300">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/blog" className="hover:text-slate-300">Blog</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-400">{post.keyword}</span>
          </nav>

          {/* Title */}
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">{post.keyword}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">{post.h1}</h1>
          <p className="text-sm text-slate-500 mb-8">{post.readTime}</p>

          {/* Intro */}
          <p className="text-lg text-slate-300 leading-relaxed mb-10">{post.intro}</p>

          {/* Sections */}
          {post.sections.map((s, i) => (
            <section key={i} className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{s.heading}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="text-slate-300 leading-relaxed mb-4">{p}</p>
              ))}
              {s.list && (
                <ul className="space-y-2.5 mt-4">
                  {s.list.map((item, k) => (
                    <li key={k} className="flex items-start gap-2.5 text-slate-300">
                      <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* CTA */}
          <div className="my-12 rounded-2xl border border-brand-800/30 bg-brand-950/30 p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Try BounceTrap free</h2>
            <p className="text-slate-400 text-sm mb-5 max-w-md mx-auto">
              Get 100 free credits on signup. Verify emails, clean lists and check deliverability in minutes — credits never expire.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors">
              Start verifying free →
            </Link>
          </div>

          {/* FAQ */}
          {post.faqs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Frequently asked questions</h2>
              <div className="space-y-4">
                {post.faqs.map((f, i) => (
                  <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                    <h3 className="text-white font-semibold text-sm mb-2">{f.q}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related posts */}
          <section className="border-t border-white/8 pt-8">
            <h2 className="text-lg font-bold text-white mb-4">Related guides</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`} className="rounded-xl border border-white/8 bg-white/[0.02] p-4 hover:border-brand-500/40 hover:bg-white/[0.04] transition-colors">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-400 mb-1.5">{p.keyword}</p>
                  <p className="text-sm text-slate-300 leading-snug">{p.h1}</p>
                </Link>
              ))}
            </div>
          </section>
        </article>

        {/* Footer */}
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
