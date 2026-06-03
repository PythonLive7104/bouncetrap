import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

function CreditStatusCard({ plan, credits }) {
  if (!plan || plan === 'free') return null

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-sm font-semibold text-emerald-300">
            Active — {(credits ?? 0).toLocaleString()} credit{credits !== 1 ? 's' : ''} available
          </p>
        </div>
        <p className="text-xs text-slate-500 pl-4 mt-1">
          Your credits never expire and your account never pauses. Top up any time — no monthly subscription, no renewals.
        </p>
      </div>
    </div>
  )
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    monthlyCredits: 100,
    features: [
      '100 one-time signup credits',
      'Single email verification',
      'Dashboard access',
      'No API access',
      'No bulk verification',
    ],
    cta: null,
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 20,
    monthlyCredits: 25_000,
    features: [
      '25,000 credits',
      'Single + bulk verification',
      'Full API access',
      'Up to 5,000 emails per job',
      'Email support',
    ],
    cta: 'Get Starter',
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 70,
    monthlyCredits: 100_000,
    features: [
      '100,000 credits',
      'Everything in Starter',
      'Up to 50,000 emails per job',
      'Deliverability tools',
      'Priority support',
    ],
    cta: 'Get Growth',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 110,
    monthlyCredits: 200_000,
    features: [
      '200,000 credits',
      'Everything in Growth',
      'Up to 500,000 emails per job',
      'Dedicated account manager',
      'Custom integrations',
    ],
    cta: 'Get Pro',
    highlight: false,
  },
]

const PLAN_LIMITS = { free: 100, starter: 25000, growth: 100000, pro: 200000, enterprise: 500000 }

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function PlanCard({ plan, isCurrent, isYearly, onUpgrade, isUpgrading }) {
  const price   = isYearly ? plan.monthlyPrice * 10 : plan.monthlyPrice
  const credits = isYearly ? plan.monthlyCredits * 12 : plan.monthlyCredits
  const savings = plan.monthlyPrice > 0 ? plan.monthlyPrice * 2 : 0

  return (
    <div className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
      plan.highlight
        ? 'border-brand-500/50 bg-brand-600/5 shadow-lg shadow-brand-900/20'
        : isCurrent
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-white/8 bg-white/[0.02]'
    }`}>
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="text-xs px-3 py-1 rounded-full bg-brand-600 text-white font-semibold shadow-lg whitespace-nowrap">
            Most popular
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 right-4 z-10">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-600 text-white font-semibold shadow-lg whitespace-nowrap">
            Current plan
          </span>
        </div>
      )}

      {/* Plan header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{plan.name}</p>
        {plan.monthlyPrice === 0 ? (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">Free</span>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">${price}</span>
              {isYearly && <span className="text-slate-500 text-sm">/year</span>}
            </div>
            {isYearly && savings > 0 && (
              <p className="text-xs text-emerald-400 font-medium mt-0.5">Save ${savings}/yr vs. bundle</p>
            )}
            {!isYearly && (
              <p className="text-xs text-slate-600 mt-0.5">or ${plan.monthlyPrice * 10}/yr (save ${savings})</p>
            )}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-1.5">
          {credits.toLocaleString()} credits{isYearly && plan.monthlyPrice > 0 ? '/year' : ''}
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-2 flex-1">
        {plan.monthlyPrice > 0 && (
          <li className="flex items-start gap-2 text-sm text-slate-300">
            <CheckIcon />
            {credits.toLocaleString()} credits
          </li>
        )}
        {plan.features.slice(plan.monthlyPrice > 0 ? 1 : 0).map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {plan.cta && !isCurrent && (
        <button
          onClick={() => onUpgrade(plan.id)}
          disabled={isUpgrading}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-wait ${
            plan.highlight
              ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-900/30'
              : 'bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/10'
          }`}
        >
          {isUpgrading ? 'Redirecting…' : plan.cta}
        </button>
      )}
      {isCurrent && (
        <div className="py-2.5 text-center text-sm text-emerald-400 font-semibold border border-emerald-500/20 rounded-xl bg-emerald-500/5">
          Active plan
        </div>
      )}
      {!plan.cta && !isCurrent && (
        <div className="py-2.5 text-center text-sm text-slate-600 font-medium">
          No payment needed
        </div>
      )}
    </div>
  )
}

const PACKS = [
  { id: 'pack_25k',  credits: 25_000,  price: 20,  label: '25K' },
  { id: 'pack_50k',  credits: 50_000,  price: 40,  label: '50K' },
  { id: 'pack_100k', credits: 100_000, price: 70,  label: '100K' },
  { id: 'pack_200k', credits: 200_000, price: 140, label: '200K' },
  { id: 'pack_400k', credits: 400_000, price: 230, label: '400K' },
]

function CreditPacksSection({ onBuy, buying }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <div className="flex items-start justify-between mb-1 gap-4 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-base">Credit top-ups</h3>
          <p className="text-slate-500 text-sm mt-0.5">Need more credits without changing your plan? Buy a one-time pack.</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium shrink-0">Credits never expire</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
        {PACKS.map((pack) => (
          <button
            key={pack.id}
            onClick={() => onBuy(pack.id)}
            disabled={!!buying}
            className={`flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border transition-all disabled:opacity-60 disabled:cursor-wait ${
              buying === pack.id
                ? 'border-brand-500/50 bg-brand-500/10'
                : 'border-white/8 bg-white/[0.03] hover:border-brand-500/40 hover:bg-white/[0.06]'
            }`}
          >
            <span className="text-xl font-bold text-white">{pack.label}</span>
            <span className="text-xs text-slate-400">credits</span>
            <span className="text-base font-semibold text-brand-300 mt-1">${pack.price}</span>
            {buying === pack.id && (
              <svg className="w-4 h-4 animate-spin text-brand-400 mt-1" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-600 mt-4">
        Paid via NOWPayments (crypto). Credits are added immediately upon payment confirmation.
      </p>
    </div>
  )
}

const STATUS_STYLES = {
  waiting:    'bg-amber-500/10 text-amber-300 border-amber-500/20',
  confirming: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  confirmed:  'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  finished:   'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  failed:     'bg-red-500/10 text-red-300 border-red-500/20',
  expired:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

function InvoicesSection() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/billing/invoices/')
      .then(({ data }) => setInvoices(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Payment history</h3>
        <span className="text-xs text-slate-500">All payments via NOWPayments</span>
      </div>

      {loading ? (
        <div className="divide-y divide-white/5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between animate-pulse">
              <div className="space-y-1.5">
                <div className="h-3.5 w-40 rounded bg-white/8" />
                <div className="h-2.5 w-24 rounded bg-white/5" />
              </div>
              <div className="h-5 w-20 rounded-full bg-white/8" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-500 text-sm">No payments yet.</p>
          <p className="text-slate-600 text-xs mt-1">Your payment history will appear here after your first purchase.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {invoices.map((inv) => (
            <div key={inv.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-slate-200 text-sm font-medium">{inv.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {inv.resolved_at && inv.status === 'finished' && (
                    <span className="ml-2 text-slate-600">· confirmed {new Date(inv.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-white">${parseFloat(inv.amount_usd).toFixed(2)}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${STATUS_STYLES[inv.status] || STATUS_STYLES.waiting}`}>
                  {inv.status}
                </span>
                {(inv.status === 'waiting' || inv.status === 'confirming') && (
                  <a
                    href={inv.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors"
                  >
                    Pay now
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BillingPage() {
  const { user, credits } = useAuthStore()
  const [isYearly, setIsYearly]         = useState(false)
  const [ledger, setLedger]             = useState([])
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [upgrading, setUpgrading]       = useState(null)
  const [upgradeError, setUpgradeError] = useState('')
  const [buyingPack, setBuyingPack]     = useState(null)
  const [packError, setPackError]       = useState('')

  const currentPlan = user?.plan || 'free'
  const isFreePlan  = currentPlan === 'free'
  // Free trial shows usage against the 100-credit baseline; paid accounts just
  // show their balance (credits-only model — no fixed monthly allowance).
  const planLimit   = 100
  const used        = Math.max(0, planLimit - credits)
  const usedPct     = isFreePlan ? Math.min((used / planLimit) * 100, 100) : 0

  useEffect(() => {
    api.get('/billing/credits/history/?limit=8')
      .then(({ data }) => setLedger(data.results || data))
      .catch(() => {})
      .finally(() => setLedgerLoading(false))
  }, [])

  async function handleBuyPack(packId) {
    setBuyingPack(packId)
    setPackError('')
    try {
      const { data } = await api.post('/billing/nowpayments/buy-pack/', { pack_id: packId })
      window.location.href = data.invoice_url
    } catch (err) {
      setPackError(err.response?.data?.detail || 'Could not create payment. Please try again.')
      setBuyingPack(null)
    }
  }

  async function handleUpgrade(planId) {
    setUpgrading(planId)
    setUpgradeError('')
    try {
      const { data } = await api.post('/billing/nowpayments/create-invoice/', {
        plan: planId,
        billing_period: isYearly ? 'yearly' : 'monthly',
      })
      window.location.href = data.invoice_url
    } catch (err) {
      setUpgradeError(err.response?.data?.detail || 'Could not create payment. Please try again.')
      setUpgrading(null)
    }
  }

  const barColor = usedPct > 80 ? 'bg-red-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-brand-500'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Billing & Plan</h2>
        <p className="text-sm text-slate-400 mt-1">Manage your subscription and credit usage.</p>
      </div>

      <CreditStatusCard plan={currentPlan} credits={credits} />

      {/* Current usage */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
        <div className="flex items-start justify-between mb-5 gap-4">
          <div>
            <h3 className="text-white font-semibold text-base">Credit balance</h3>
            <p className="text-slate-500 text-sm mt-0.5">{isFreePlan ? 'Free trial' : 'Pay-as-you-go · credits never expire'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-white">{credits.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{isFreePlan ? `of ${planLimit} free` : 'credits available'}</p>
          </div>
        </div>

        {isFreePlan ? (
          <>
            <div className="w-full h-2.5 rounded-full bg-white/8 mb-2 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{used.toLocaleString()} used</span>
              <span>{planLimit.toLocaleString()} total</span>
            </div>
          </>
        ) : (
          <div className="w-full h-2.5 rounded-full bg-emerald-500/20 mb-2 overflow-hidden">
            <div className="h-2.5 rounded-full bg-emerald-500 w-full" />
          </div>
        )}

        {currentPlan === 'free' && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-300/80 text-xs">
            Free credits are a one-time signup bonus and do not renew monthly. Upgrade to get recurring credits.
          </div>
        )}
        {usedPct > 80 && currentPlan !== 'free' && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300/80 text-xs">
            You've used over 80% of your monthly credits. Consider upgrading before you run out.
          </div>
        )}
      </div>

      {/* Credit pack top-ups */}
      {packError && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{packError}</div>
      )}
      <CreditPacksSection onBuy={handleBuyPack} buying={buyingPack} />

      {/* Plan selector with monthly/yearly toggle */}
      <div>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <h3 className="text-white font-semibold text-base">Choose a plan</h3>

          {/* Billing toggle */}
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-white' : 'text-slate-500'}`}>Bundle</span>
            <button
              onClick={() => setIsYearly((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isYearly ? 'bg-brand-600' : 'bg-white/15'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-white' : 'text-slate-500'}`}>Yearly</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">
                Save 17%
              </span>
            </div>
          </div>
        </div>

        {isYearly && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-emerald-300/90 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Yearly billing: pay for 10 months, receive 12 months of credits. That's 2 months free.
          </div>
        )}

        {upgradeError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {upgradeError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlan}
              isYearly={isYearly}
              onUpgrade={handleUpgrade}
              isUpgrading={upgrading === plan.id}
            />
          ))}
        </div>

        <p className="text-xs text-slate-600 mt-4 text-center">
          Payments processed securely via NOWPayments. 100+ cryptocurrencies accepted including BTC, ETH, USDT, LTC and more.
        </p>
      </div>

      {/* Credit ledger */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Credit history</h3>
          <span className="text-xs text-slate-500">Last 8 transactions</span>
        </div>

        {ledgerLoading ? (
          <div className="divide-y divide-white/5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between animate-pulse">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 rounded bg-white/8" />
                  <div className="h-2.5 w-20 rounded bg-white/5" />
                </div>
                <div className="h-4 w-16 rounded bg-white/8" />
              </div>
            ))}
          </div>
        ) : ledger.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-500 text-sm">
            No credit transactions yet.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {ledger.map((entry, i) => {
              const isDebit  = entry.operation === 'used'
              const isBought = entry.operation === 'purchased' || entry.operation === 'signup_bonus'
              const amountColor = isBought ? 'text-emerald-400' : isDebit ? 'text-red-400' : 'text-slate-300'
              const sign = isBought ? '+' : isDebit ? '−' : ''
              const opLabel = {
                used: 'Verification',
                purchased: 'Purchase',
                signup_bonus: 'Signup bonus',
                manual: 'Manual adjustment',
              }[entry.operation] || entry.operation

              return (
                <div key={i} className="px-6 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-slate-300 text-sm font-medium">{opLabel}</p>
                    {entry.reference && (
                      <p className="text-xs text-slate-600 truncate mt-0.5">{entry.reference}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-0.5">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-semibold font-mono ${amountColor}`}>
                      {sign}{Math.abs(entry.amount).toLocaleString()}
                    </span>
                    {entry.balance_after !== undefined && (
                      <p className="text-xs text-slate-600">bal: {entry.balance_after.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <InvoicesSection />
    </div>
  )
}
