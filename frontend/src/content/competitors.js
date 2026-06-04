// Competitor data for programmatic comparison + alternative pages.
// Each entry carries UNIQUE descriptors so generated pages are differentiated
// (not thin name-swaps). `blurb` and `angle` vary the intro and competitor section.
// Keep competitor claims general and verifiable — pricing/specs change.

export const COMPETITORS = [
  { name: 'ZeroBounce', slug: 'zerobounce', blurb: 'a well-established email validation service known for verification, activity data and a suite of deliverability add-ons.', angle: 'expiring credits and subscription pricing' },
  { name: 'NeverBounce', slug: 'neverbounce', blurb: 'a popular real-time and bulk verification tool, part of the ZoomInfo family, with a credit-based model.', angle: 'per-credit pricing and the lack of bundled deliverability tools' },
  { name: 'Kickbox', slug: 'kickbox', blurb: 'a verification provider known for its "Sendex" quality score and developer-friendly API.', angle: 'price per verification and credit expiry' },
  { name: 'MillionVerifier', slug: 'millionverifier', blurb: 'a budget bulk verification tool popular for one-off list cleaning.', angle: 'a verification-only feature set with no deliverability suite' },
  { name: 'Hunter', slug: 'hunter', blurb: 'best known for email finding, with verification offered as a secondary feature.', angle: 'verification being secondary to lead-finding, on monthly plans' },
  { name: 'BriteVerify', slug: 'briteverify', blurb: 'an enterprise-focused verification product from Validity, often used inside large marketing stacks.', angle: 'enterprise pricing that can be steep for smaller teams' },
  { name: 'Emailable', slug: 'emailable', blurb: 'a clean, modern verification tool with real-time and bulk options.', angle: 'subscription tiers and credit expiry' },
  { name: 'DeBounce', slug: 'debounce', blurb: 'an affordable bulk verification service with a range of integrations.', angle: 'a verification-only scope without a full deliverability suite' },
  { name: 'Clearout', slug: 'clearout', blurb: 'a verification and email-finder tool aimed at sales and marketing teams.', angle: 'credit packs that can expire and limited free usage' },
  { name: 'EmailListVerify', slug: 'emaillistverify', blurb: 'a low-cost bulk verification service focused on cleaning large lists.', angle: 'a bare-bones feature set beyond verification' },
  { name: 'Verifalia', slug: 'verifalia', blurb: 'a verification API provider with multi-level validation and SDKs.', angle: 'developer-first pricing and credit expiry' },
  { name: 'Bouncer', slug: 'bouncer', blurb: 'a GDPR-focused verification tool known for accuracy and a toxicity check.', angle: 'subscription plans and add-on costs' },
  { name: 'Snov.io', slug: 'snovio', blurb: 'an all-in-one sales platform with email finding, verification and outreach.', angle: 'verification bundled into a broader (and pricier) sales suite' },
  { name: 'MailerCheck', slug: 'mailercheck', blurb: 'a verification and deliverability tool from the MailerLite team.', angle: 'credit-based pricing within the MailerLite ecosystem' },
  { name: 'QuickEmailVerification', slug: 'quickemailverification', blurb: 'a straightforward verification service with API and bulk options.', angle: 'credit expiry and a verification-only scope' },
  { name: 'Mailfloss', slug: 'mailfloss', blurb: 'an automated list-cleaning tool that plugs into your ESP.', angle: 'a subscription model billed on list size' },
  { name: 'Xverify', slug: 'xverify', blurb: 'a real-time verification service aimed at lead-gen and forms.', angle: 'enterprise-leaning pricing and limited self-serve' },
  { name: 'TrueMail', slug: 'truemail', blurb: 'a bulk and API verification tool for cleaning lists at scale.', angle: 'credit expiry and a narrow feature set' },
  { name: 'MyEmailVerifier', slug: 'myemailverifier', blurb: 'a budget verification service for bulk and real-time checks.', angle: 'a verification-only product with no deliverability tools' },
  { name: 'AtData', slug: 'atdata', blurb: 'an enterprise email intelligence and validation provider (formerly TowerData).', angle: 'enterprise contracts that are overkill for most teams' },
  { name: 'Pabbly Email Verification', slug: 'pabbly', blurb: 'a verification tool bundled within the Pabbly app suite.', angle: 'credits tied to the Pabbly ecosystem' },
  { name: 'Reoon', slug: 'reoon', blurb: 'a verification tool offering bulk checks and an API.', angle: 'a verification-only scope without deliverability monitoring' },
  { name: 'Email Hippo', slug: 'email-hippo', blurb: 'a verification API provider with a focus on data quality.', angle: 'API-credit pricing and limited bundled tooling' },
  { name: 'Captain Verify', slug: 'captain-verify', blurb: 'a European bulk and API verification service.', angle: 'credit packs and a verification-only feature set' },
  { name: 'Proofy', slug: 'proofy', blurb: 'a bulk verification tool for cleaning email lists.', angle: 'a narrow scope limited to verification' },
  { name: 'Verifybee', slug: 'verifybee', blurb: 'a verification and list-cleaning tool with integrations.', angle: 'subscription pricing and credit limits' },
  { name: 'Heybounce', slug: 'heybounce', blurb: 'a verification service focused on accuracy for cold email.', angle: 'a verification-only scope' },
  { name: 'Listwise', slug: 'listwise', blurb: 'a long-running list-cleaning and verification service.', angle: 'credit packs without a modern deliverability suite' },
  { name: 'Bouncify', slug: 'bouncify', blurb: 'a bulk and real-time verification service with a simple interface.', angle: 'credit expiry and a verification-only scope' },
  { name: 'Mailboxlayer', slug: 'mailboxlayer', blurb: 'a verification API from apilayer aimed at developers.', angle: 'API-request pricing with no bundled deliverability tools' },
  { name: 'EmailOversight', slug: 'emailoversight', blurb: 'a verification and email-append service for marketers.', angle: 'a marketing-data focus rather than a deliverability suite' },
  { name: 'DataValidation', slug: 'datavalidation', blurb: 'a list-grading and verification service.', angle: 'list-grading credits without modern deliverability monitoring' },
  { name: 'Email Checker', slug: 'email-checker', blurb: 'a simple bulk verification service.', angle: 'a minimal feature set limited to verification' },
  { name: 'Verify Email', slug: 'verify-email', blurb: 'a basic single and bulk verification tool.', angle: 'a verification-only scope' },
  { name: 'Blaze Verify', slug: 'blaze-verify', blurb: 'a verification tool now part of Emailable.', angle: 'a verification-only product without a deliverability suite' },
  { name: 'NeverBounce vs Kickbox', slug: 'neverbounce-vs-kickbox', blurb: 'two leading verification providers compared head-to-head.', angle: 'choosing between two credit-based tools — and an alternative without expiry', threeWay: true },
  { name: 'ZeroBounce vs NeverBounce', slug: 'zerobounce-vs-neverbounce', blurb: 'two of the biggest names in email verification.', angle: 'choosing between two subscription/credit tools — and a simpler third option', threeWay: true },
  { name: 'Kickbox vs ZeroBounce', slug: 'kickbox-vs-zerobounce', blurb: 'two leading verification providers compared.', angle: 'picking between two credit-based tools — and an alternative without expiry', threeWay: true },
]

export function getCompetitor(slug) {
  return COMPETITORS.find((c) => c.slug === slug)
}
