// Regenerates public/sitemap.xml from the content data files.
// Run: node scripts/generate-sitemap.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { COMPETITORS } from '../src/content/competitors.js'
import { INDUSTRIES } from '../src/content/industries.js'
import { PROVIDERS } from '../src/content/providers.js'
import { DELIVERABILITY_CLUSTER } from '../src/content/deliverabilityCluster.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'https://bouncetrap.net'
const TODAY = new Date().toISOString().slice(0, 10)

// Static / guide / how-to / tool slugs (stable)
const guideSlugs = [
  'email-verification-tool', 'verify-email-address', 'bulk-email-verification',
  'email-list-cleaning', 'email-bounce-checker', 'smtp-validation',
  'disposable-email-checker', 'email-deliverability-checker',
  'how-to-reduce-email-bounce-rate', 'how-to-verify-email-without-sending',
  'how-to-clean-a-mailchimp-list', 'best-email-verification-software',
  'best-email-verification-api',
]
const toolSlugs = ['spf-checker', 'dkim-checker', 'dmarc-checker', 'mx-lookup', 'blacklist-checker']

// Derive comparison + alternative slugs from competitor data
const comparisonSlugs = COMPETITORS.map((c) => (c.threeWay ? c.slug : `${c.slug}-vs-bouncetrap`))
const alternativeSlugs = COMPETITORS.filter((c) => !c.threeWay).map((c) => `${c.slug}-alternative`)
const clusterSlugs = DELIVERABILITY_CLUSTER.map((p) => p.slug)
const industryPaths = INDUSTRIES.map((i) => `/email-verification-for/${i.slug}`)
const providerPaths = PROVIDERS.map((p) => `/verify-email/${p.slug}`)

const url = (loc, priority, freq = 'monthly') =>
  `  <url><loc>${BASE}${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`

const entries = [
  url('/', '1.0', 'weekly'),
  url('/register', '0.7'),
  url('/tools', '0.9', 'weekly'),
  url('/blog', '0.8', 'weekly'),
  url('/disposable-email-domains', '0.8'),
  ...toolSlugs.map((s) => url(`/tools/${s}`, '0.9')),
  ...guideSlugs.map((s) => url(`/blog/${s}`, '0.9')),
  ...clusterSlugs.map((s) => url(`/blog/${s}`, '0.8')),
  ...comparisonSlugs.map((s) => url(`/blog/${s}`, '0.9')),
  ...alternativeSlugs.map((s) => url(`/blog/${s}`, '0.9')),
  ...industryPaths.map((p) => url(p, '0.9')),
  ...providerPaths.map((p) => url(p, '0.8')),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`

writeFileSync(join(__dirname, '..', 'public', 'sitemap.xml'), xml)
console.log(`Sitemap written: ${entries.length} URLs`)
