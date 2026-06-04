// Config for the public free tools. Each entry drives ToolPage.jsx:
// SEO meta, the API call, and how to render the result.

function Verdict({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${
      ok ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
         : 'bg-red-500/10 text-red-300 border-red-500/25'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {label}
    </span>
  )
}

function RecordBox({ record }) {
  if (!record) return null
  return (
    <pre className="mt-3 text-xs font-mono text-slate-300 bg-black/30 border border-white/8 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
      {record}
    </pre>
  )
}

export const TOOLS = [
  {
    slug: 'spf-checker',
    keyword: 'SPF Checker',
    h1: 'Free SPF Record Checker',
    title: 'SPF Checker — Check Your SPF Record Free | BounceTrap',
    metaDescription: 'Check any domain’s SPF record instantly. Free SPF checker that validates your sender policy and shows you how to fix it. No signup required.',
    placeholder: 'yourdomain.com',
    endpoint: (d) => `/deliverability/dns-check/?domain=${encodeURIComponent(d)}`,
    relatedSlug: 'email-deliverability-checker',
    intro: 'An SPF (Sender Policy Framework) record tells receiving mail servers which servers are allowed to send email for your domain. A missing or broken SPF record is one of the most common reasons legitimate email lands in spam. Enter your domain to check yours in seconds.',
    about: [
      { h: 'What is an SPF record?', p: 'SPF is a DNS TXT record listing the mail servers authorised to send email from your domain. When a server receives mail claiming to be from you, it checks this record. If the sending server is not listed, the message is more likely to be marked as spam or rejected.' },
      { h: 'How to fix a missing SPF record', p: 'Add a TXT record to your DNS in the form "v=spf1 include:yourprovider.com ~all". Include the send domains of every service you use (your email host, marketing platform, CRM). Avoid more than 10 DNS lookups, and never publish two SPF records on one domain.' },
    ],
    faqs: [
      { q: 'What does a valid SPF record look like?', a: 'It starts with v=spf1 and ends with an all mechanism, e.g. "v=spf1 include:_spf.google.com ~all". The includes list your authorised senders.' },
      { q: 'Can I have more than one SPF record?', a: 'No. A domain must have exactly one SPF record. Multiple records cause SPF to fail — merge them into one.' },
    ],
    renderResult: (data) => {
      const spf = data.spf || {}
      return (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-white font-semibold">SPF for {data.domain}</span>
            <Verdict ok={spf.found} label={spf.found ? 'SPF record found' : 'No SPF record'} />
          </div>
          <RecordBox record={spf.record} />
          {spf.guidance && <p className="text-sm text-slate-400 mt-3">{spf.guidance}</p>}
        </div>
      )
    },
  },
  {
    slug: 'dkim-checker',
    keyword: 'DKIM Checker',
    h1: 'Free DKIM Record Checker',
    title: 'DKIM Checker — Check Your DKIM Record Free | BounceTrap',
    metaDescription: 'Check your domain’s DKIM record for free. Validates common selectors and shows whether your email signing is set up correctly. No signup required.',
    placeholder: 'yourdomain.com',
    endpoint: (d) => `/deliverability/dns-check/?domain=${encodeURIComponent(d)}`,
    relatedSlug: 'email-deliverability-checker',
    intro: 'DKIM (DomainKeys Identified Mail) adds a cryptographic signature to your emails so receiving servers can confirm they really came from you and were not tampered with. This free checker looks up the common DKIM selectors for your domain.',
    about: [
      { h: 'What is DKIM?', p: 'DKIM publishes a public key in your DNS. Your mail server signs each message with the matching private key, and receivers verify the signature against the published key. A valid DKIM signature boosts deliverability and protects against spoofing.' },
      { h: 'How to set up DKIM', p: 'Enable DKIM in your email provider (Google Workspace, Microsoft 365, SendGrid, etc.), then add the DKIM TXT record they give you to your DNS at the specified selector (e.g. google._domainkey.yourdomain.com). Allow time for DNS to propagate.' },
    ],
    faqs: [
      { q: 'What is a DKIM selector?', a: 'A selector is a label that points to a specific DKIM key in your DNS, allowing multiple keys per domain. Common selectors include "google", "default", "s1" and "k1".' },
      { q: 'Why can’t the checker find my DKIM?', a: 'DKIM lives at a provider-specific selector. If we can’t find it on common selectors, check your email provider for the exact selector name they use.' },
    ],
    renderResult: (data) => {
      const dkim = data.dkim || {}
      return (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-white font-semibold">DKIM for {data.domain}</span>
            <Verdict ok={dkim.found} label={dkim.found ? `DKIM found (${dkim.selector})` : 'No DKIM on common selectors'} />
          </div>
          <RecordBox record={dkim.record} />
          {dkim.guidance && <p className="text-sm text-slate-400 mt-3">{dkim.guidance}</p>}
        </div>
      )
    },
  },
  {
    slug: 'dmarc-checker',
    keyword: 'DMARC Checker',
    h1: 'Free DMARC Record Checker',
    title: 'DMARC Checker — Check Your DMARC Record Free | BounceTrap',
    metaDescription: 'Check your domain’s DMARC record and policy for free. See whether your domain is protected against spoofing and how to strengthen it. No signup.',
    placeholder: 'yourdomain.com',
    endpoint: (d) => `/deliverability/dns-check/?domain=${encodeURIComponent(d)}`,
    relatedSlug: 'email-deliverability-checker',
    intro: 'DMARC (Domain-based Message Authentication, Reporting & Conformance) ties SPF and DKIM together and tells receivers what to do with mail that fails authentication. It is the strongest protection against someone spoofing your domain. Check your DMARC policy below.',
    about: [
      { h: 'What is DMARC?', p: 'DMARC builds on SPF and DKIM. Its policy (p=none, quarantine or reject) tells inbox providers how to handle unauthenticated mail from your domain, and its reporting tells you who is sending as you.' },
      { h: 'Which DMARC policy should I use?', p: 'Start at p=none to monitor without affecting delivery. Once your legitimate mail consistently passes, move to p=quarantine, then p=reject for full protection against spoofing.' },
    ],
    faqs: [
      { q: 'Where does the DMARC record live?', a: 'At the special subdomain _dmarc.yourdomain.com as a TXT record starting with v=DMARC1.' },
      { q: 'Is p=none safe?', a: 'Yes — it only monitors and never blocks mail. But it offers no protection, so treat it as a temporary step toward quarantine or reject.' },
    ],
    renderResult: (data) => {
      const dmarc = data.dmarc || {}
      return (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-white font-semibold">DMARC for {data.domain}</span>
            <Verdict ok={dmarc.found} label={dmarc.found ? `Policy: p=${dmarc.policy || 'none'}` : 'No DMARC record'} />
          </div>
          <RecordBox record={dmarc.record} />
          {dmarc.guidance && <p className="text-sm text-slate-400 mt-3">{dmarc.guidance}</p>}
        </div>
      )
    },
  },
  {
    slug: 'mx-lookup',
    keyword: 'MX Lookup',
    h1: 'Free MX Record Lookup',
    title: 'MX Lookup — Check MX Records Free | BounceTrap',
    metaDescription: 'Look up any domain’s MX records for free. See which mail servers handle a domain’s email and confirm it can receive mail. No signup required.',
    placeholder: 'yourdomain.com',
    endpoint: (d) => `/deliverability/mx-check/?domain=${encodeURIComponent(d)}`,
    relatedSlug: 'email-bounce-checker',
    intro: 'MX (Mail Exchange) records tell the internet which servers receive email for a domain. If a domain has no MX records, it cannot receive email — and any address there will hard bounce. Look up a domain’s mail servers below.',
    about: [
      { h: 'What is an MX record?', p: 'An MX record is a DNS entry pointing to the mail servers responsible for accepting email for a domain, each with a priority value. Lower priority numbers are tried first.' },
      { h: 'Why MX records matter for deliverability', p: 'No MX record means no inbox — mail to that domain bounces immediately. Verifying MX records is the first step email verification tools take when checking whether an address is reachable.' },
    ],
    faqs: [
      { q: 'What does it mean if a domain has no MX records?', a: 'It cannot receive email. Every address on that domain will hard bounce, so they should be removed from any list.' },
      { q: 'Can a domain have multiple MX records?', a: 'Yes — multiple records provide redundancy. Mail is delivered to the lowest-priority server first, falling back to others if it is unavailable.' },
    ],
    renderResult: (data) => (
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <span className="text-white font-semibold">MX for {data.domain}</span>
          <Verdict ok={data.mx_found} label={data.mx_found ? `${data.count} mail server${data.count !== 1 ? 's' : ''}` : 'No MX records'} />
        </div>
        {data.mx_records?.length > 0 && (
          <div className="space-y-1.5">
            {data.mx_records.map((mx, i) => (
              <div key={i} className="text-xs font-mono text-slate-300 bg-black/30 border border-white/8 rounded-lg px-3 py-2 break-all">{mx}</div>
            ))}
          </div>
        )}
        {data.guidance && <p className="text-sm text-slate-400 mt-3">{data.guidance}</p>}
      </div>
    ),
  },
  {
    slug: 'blacklist-checker',
    keyword: 'Blacklist Checker',
    h1: 'Free Email Blacklist Checker',
    title: 'Blacklist Checker — Check Domain & IP Blacklists Free | BounceTrap',
    metaDescription: 'Check whether your domain or its mail servers are on major email blacklists (DNSBLs) for free. Find and fix reputation problems. No signup required.',
    placeholder: 'yourdomain.com',
    endpoint: (d) => `/deliverability/blacklist/?domain=${encodeURIComponent(d)}`,
    relatedSlug: 'email-deliverability-checker',
    intro: 'Email blacklists (DNSBLs) track domains and IPs associated with spam. If your sending domain or mail server is listed, your emails get blocked or sent to spam. This free checker scans your domain and its mail-server IPs against major blacklists.',
    about: [
      { h: 'What is an email blacklist?', p: 'A DNSBL (DNS-based blocklist) is a published list of domains or IP addresses known for sending spam. Inbox providers query these lists in real time and block or filter mail from listed senders.' },
      { h: 'How to get off a blacklist', p: 'Identify why you were listed (compromised account, spam complaints, dirty list), fix the root cause, then submit a delisting request on the blacklist’s website. Clean your list and authenticate your domain to avoid re-listing.' },
    ],
    faqs: [
      { q: 'Why is my domain blacklisted?', a: 'Common causes are high spam complaints, sending to spam traps, a compromised account, or a poor-quality list. Verifying your list before sending prevents most of these.' },
      { q: 'How long does delisting take?', a: 'It varies by list — some remove you automatically after a clean period, others require a manual request that can take a few days.' },
    ],
    renderResult: (data) => {
      const all = [
        ...(data.domain_results || []),
        ...Object.values(data.ip_results || {}).flat(),
      ]
      return (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <span className="text-white font-semibold">Blacklist scan: {data.domain}</span>
            <Verdict ok={!data.blacklisted} label={data.blacklisted ? `Listed on ${data.listed_count}` : `Clean (${data.clean_count} checked)`} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {all.map((r, i) => (
              <div key={i} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
                r.listed === true  ? 'bg-red-500/10 text-red-300 border-red-500/20'
                : r.listed === false ? 'bg-white/[0.03] text-slate-400 border-white/8'
                : 'bg-amber-500/5 text-amber-400/70 border-amber-500/15'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  r.listed === true ? 'bg-red-400' : r.listed === false ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
                <span className="truncate">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
  },
]

export function getTool(slug) {
  return TOOLS.find((t) => t.slug === slug)
}
