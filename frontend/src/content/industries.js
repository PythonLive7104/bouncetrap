// Industry landing pages — commercial intent, conversion-focused.
// Rendered by IndustryPage at /email-verification-for/:slug.

export const INDUSTRIES = [
  {
    slug: 'agencies',
    name: 'Marketing Agencies',
    keyword: 'email verification for agencies',
    title: 'Email Verification for Marketing Agencies | BounceTrap',
    metaDescription: 'Clean client email lists at scale, cut bounces, and protect every client’s sender reputation. Bulk verification, team accounts and reports. 100 free credits.',
    hero: 'Clean every client list before it sends',
    subhero: 'Agencies run campaigns across dozens of client lists. One dirty list can tank a client’s deliverability — and your retainer. BounceTrap cleans them all at scale, with credits that never expire.',
    painPoints: [
      'A single high-bounce campaign damages a client’s sender reputation',
      'Manually checking lists across many clients eats billable hours',
      'Buying separate verification subscriptions per client gets expensive',
    ],
    benefits: [
      { h: 'Bulk-clean any client list', p: 'Upload a CSV, auto-deduplicate, and verify thousands of addresses in parallel. Download a graded results file to show clients the value you deliver.' },
      { h: 'One credit pool, every client', p: 'Pay-as-you-go credits that never expire — use them across all your clients with no per-seat subscription. Top up only when you need to.' },
      { h: 'Deliverability tools included', p: 'Check each client’s SPF, DKIM, DMARC and blacklist status, and monitor domain reputation — all in one place, no add-ons.' },
      { h: 'Team accounts & API', p: 'Bring your team in, or automate verification into your onboarding workflow via the REST API.' },
    ],
    useCase: 'A growth agency verifies every new client list before the first send, drops bounce rates below 2%, and uses the graded health report as a deliverability deliverable in client reporting.',
  },
  {
    slug: 'saas',
    name: 'SaaS Companies',
    keyword: 'email verification for saas',
    title: 'Email Verification for SaaS Companies | BounceTrap',
    metaDescription: 'Block fake signups, cut trial abuse, and keep transactional emails landing. Real-time verification API with a free key and 100 credits. No subscription.',
    hero: 'Stop fake signups before they cost you',
    subhero: 'Disposable and fake email addresses inflate your metrics, abuse free trials, and hurt deliverability. Verify every signup in real time with a single API call.',
    painPoints: [
      'Disposable emails abuse free trials and skew activation metrics',
      'Invalid addresses cause transactional emails to bounce',
      'Fake accounts pollute your analytics and CRM',
    ],
    benefits: [
      { h: 'Real-time signup validation', p: 'Drop the API into your signup form to reject disposable and invalid addresses before they enter your database — in well under a second.' },
      { h: 'Cut trial abuse', p: 'Block throwaway inboxes that sign up for trial after trial, protecting your conversion data and infrastructure costs.' },
      { h: 'Protect transactional deliverability', p: 'Verified addresses mean your password resets, receipts and onboarding emails actually arrive.' },
      { h: 'Developer-first', p: 'Simple REST API, webhooks for bulk jobs, clear verdicts and a deliverability score. Free API key to start.' },
    ],
    useCase: 'A B2B SaaS adds the verification API to its signup form, cuts disposable-email trials by blocking them at the door, and improves trial-to-paid conversion data quality overnight.',
  },
  {
    slug: 'ecommerce',
    name: 'Ecommerce',
    keyword: 'email verification for ecommerce',
    title: 'Email Verification for Ecommerce Stores | BounceTrap',
    metaDescription: 'Verify customer emails, recover more carts, and protect your sender reputation. Clean your Shopify or WooCommerce list with 100 free credits. No subscription.',
    hero: 'Reach every customer’s inbox',
    subhero: 'Cart recovery, order updates and promos only work if they’re delivered. Verify your customer list to cut bounces and keep your store’s emails out of spam.',
    painPoints: [
      'Abandoned-cart and promo emails bounce or land in spam',
      'Checkout typos create invalid customer addresses',
      'A high bounce rate throttles your whole store’s deliverability',
    ],
    benefits: [
      { h: 'Verify at checkout', p: 'Validate customer emails in real time via API so order confirmations and receipts always arrive.' },
      { h: 'Clean your store list', p: 'Bulk-verify your Shopify or WooCommerce export before big promotions to protect deliverability when it matters most.' },
      { h: 'Better cart recovery', p: 'Recovery emails only convert if they’re delivered. Verified lists mean more recovered revenue.' },
      { h: 'Credits never expire', p: 'Seasonal store? Buy credits for your peak and keep the rest — they never expire and there’s no subscription.' },
    ],
    useCase: 'A Shopify store verifies its list before Black Friday, removes invalid addresses, and lands more promo emails in the inbox during its highest-revenue week.',
  },
  {
    slug: 'recruiters',
    name: 'Recruiters & Staffing',
    keyword: 'email verification for recruiters',
    title: 'Email Verification for Recruiters & Staffing | BounceTrap',
    metaDescription: 'Verify candidate and client emails so your outreach actually lands. Find and verify professional emails, cut bounces, and protect your domain. 100 free credits.',
    hero: 'Reach more candidates, bounce fewer emails',
    subhero: 'Recruiting runs on outreach. Bounced candidate and client emails waste placements and burn your sending domain. Verify before you send — and find the right email when you don’t have it.',
    painPoints: [
      'Candidate emails sourced from job boards are often outdated',
      'High bounce rates from cold outreach damage your domain',
      'Missing a candidate’s correct email costs you the placement',
    ],
    benefits: [
      { h: 'Verify candidate lists', p: 'Bulk-verify sourced lists to remove dead addresses before a campaign, keeping your bounce rate low.' },
      { h: 'Find professional emails', p: 'Use the email finder to get a candidate or client’s likely work address, then verify it in one step.' },
      { h: 'Protect your outreach domain', p: 'Clean lists keep your sender reputation healthy so your InMail-alternative outreach keeps landing.' },
      { h: 'No subscription', p: 'Pay-as-you-go credits that never expire — ideal for variable recruiting cycles.' },
    ],
    useCase: 'A staffing firm verifies every sourced candidate list before outreach, pairs the email finder with verification to fill gaps, and keeps bounce rates low across high-volume campaigns.',
  },
  {
    slug: 'real-estate',
    name: 'Real Estate',
    keyword: 'email verification for real estate',
    title: 'Email Verification for Real Estate Agents | BounceTrap',
    metaDescription: 'Keep your real estate lead lists clean and your listings landing in the inbox. Verify leads, cut bounces, and protect your sender reputation. 100 free credits.',
    hero: 'Get your listings into the inbox',
    subhero: 'Real estate is a follow-up business. If your listing alerts and nurture emails bounce or hit spam, you lose deals. Verify your lead lists to keep every email landing.',
    painPoints: [
      'Lead-gen and portal leads often have invalid or typo’d emails',
      'Bounced listing alerts mean missed showings and offers',
      'A damaged sender reputation kills your whole nurture sequence',
    ],
    benefits: [
      { h: 'Verify new leads', p: 'Check leads from portals and forms in real time so your first follow-up actually arrives.' },
      { h: 'Clean your CRM list', p: 'Bulk-verify your contact database to remove dead addresses and protect deliverability.' },
      { h: 'Keep nurture sequences landing', p: 'Drip campaigns only work if delivered. Clean lists keep your automation effective.' },
      { h: 'Credits never expire', p: 'Buy credits when you list, use them whenever — no subscription, no expiry.' },
    ],
    useCase: 'An agent verifies every portal lead before adding it to their CRM, cleans their database quarterly, and keeps listing-alert emails reliably landing in clients’ inboxes.',
  },
]

export function getIndustry(slug) {
  return INDUSTRIES.find((i) => i.slug === slug)
}
