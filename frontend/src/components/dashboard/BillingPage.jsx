import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

function LoyaltyCard({ loyalty }) {
  if (!loyalty) return null
  const { stamps, stamps_required, reward_credits, stamps_to_go, rewards_earned } = loyalty

  return (
    <div className="rounded-2xl border border-brand-800/40 bg-gradient-to-b from-brand-950/40 to-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-white font-semibold text-base">Reward card</h3>
          <p className="text-slate-500 text-sm mt-0.5">
            {stamps_to_go === 0
              ? 'Your next purchase earns the reward!'
              : `${stamps_to_go} more purchase${stamps_to_go !== 1 ? 's' : ''} → ${reward_credits.toLocaleString()} free credits`}
          </p>
        </div>
        {rewards_earned > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">
            {rewards_earned} reward{rewards_earned !== 1 ? 's' : ''} earned 🎉
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: stamps_required }).map((_, i) => {
          const filled   = i < stamps
          const isReward = i === stamps_required - 1
          return (
            <div
              key={i}
              className={`aspect-square rounded-xl flex items-center justify-center border-2 text-xs font-bold transition-colors ${
                filled
                  ? 'border-brand-500/50 bg-brand-600/25 text-brand-200'
                  : isReward
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'
                    : 'border-dashed border-white/12 bg-white/[0.02] text-slate-600'
              }`}
            >
              {filled ? '✓' : isReward ? '★' : i + 1}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-slate-600 mt-3">
        Every credit pack you buy earns one stamp. Collect {stamps_required} for {reward_credits.toLocaleString()} free credits, added automatically.
      </p>
    </div>
  )
}

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

const PACKS = [
  { id: 'pack_25k',  credits: 25_000,  price: 20,  label: '25K' },
  { id: 'pack_50k',  credits: 50_000,  price: 40,  label: '50K' },
  { id: 'pack_100k', credits: 100_000, price: 70,  label: '100K' },
  { id: 'pack_200k', credits: 200_000, price: 110, label: '200K' },
  { id: 'pack_400k', credits: 400_000, price: 230, label: '400K' },
]

function CreditPacksSection({ onBuy, buying }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <div className="flex items-start justify-between mb-1 gap-4 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-base">Buy credits</h3>
          <p className="text-slate-500 text-sm mt-0.5">Pay as you go — pick a credit pack. Your first purchase unlocks full access.</p>
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
        Paid in USDT (TRC20 / BEP20 / ERC20). Credits are added once your deposit is verified on-chain.
      </p>
    </div>
  )
}

const STATUS_STYLES = {
  pending:   'bg-slate-500/10 text-slate-300 border-slate-500/20',
  submitted: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  rejected:  'bg-red-500/10 text-red-300 border-red-500/20',
}

const STATUS_LABELS = {
  pending:   'Awaiting payment',
  submitted: 'Verifying',
  confirmed: 'Confirmed',
  rejected:  'Rejected',
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
        <span className="text-xs text-slate-500">USDT deposits</span>
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
                  {inv.resolved_at && inv.status === 'confirmed' && (
                    <span className="ml-2 text-slate-600">· confirmed {new Date(inv.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-white">{parseFloat(inv.amount_usd).toFixed(2)} USDT</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${STATUS_STYLES[inv.status] || STATUS_STYLES.pending}`}>
                  {STATUS_LABELS[inv.status] || inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DEPOSIT_WINDOW_SECONDS = 30 * 60   // 30 minutes to complete a deposit

const NETWORK_NOTE = {
  trc20: 'Lowest fees — recommended.',
  bep20: 'Low fees on BNB Smart Chain.',
  erc20: 'Higher Ethereum gas fees.',
}

function CopyButton({ value, className = '' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch { /* clipboard unavailable */ }
      }}
      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
        copied
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border-white/12 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
      } ${className}`}
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  )
}

function fmtCountdown(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = Math.floor(secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function CryptoDepositModal({ request, onClose, onSubmitted }) {
  const [networks, setNetworks]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [deposit, setDeposit]     = useState(null)
  const [creating, setCreating]   = useState(false)
  const [txHash, setTxHash]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')
  const [remaining, setRemaining] = useState(DEPOSIT_WINDOW_SECONDS)

  // Load the available USDT networks + receiving addresses.
  useEffect(() => {
    api.get('/billing/crypto/networks/')
      .then(({ data }) => {
        const nets = data.networks || []
        setNetworks(nets)
        if (nets.length) setSelected(nets[0].id)
      })
      .catch(() => setError('Could not load deposit networks. Please try again.'))
  }, [])

  // 30-minute countdown — starts once an address has been generated.
  useEffect(() => {
    if (!deposit || submitted) return
    if (remaining <= 0) return
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [deposit, submitted, remaining])

  const expired = deposit && remaining <= 0 && !submitted

  async function createDeposit() {
    if (!selected) return
    setCreating(true)
    setError('')
    try {
      const { data } = await api.post('/billing/crypto/buy-pack/', {
        pack_id: request.pack_id,
        network: selected,
      })
      setDeposit(data)
      setRemaining(DEPOSIT_WINDOW_SECONDS)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start the deposit. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  async function submitTx() {
    if (!txHash.trim()) {
      setError('Paste your transaction hash to confirm your payment.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.post('/billing/crypto/submit-tx/', { deposit_id: deposit.id, tx_hash: txHash.trim() })
      setSubmitted(true)
      onSubmitted?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const amount     = deposit ? parseFloat(deposit.amount_usd).toFixed(2) : request.amount?.toFixed(2)
  const qrSrc      = deposit
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(deposit.wallet_address)}`
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0f14] shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <h3 className="text-white font-semibold text-base">Pay with USDT</h3>
            <p className="text-xs text-slate-500 mt-0.5">{request.label} · {amount} USDT</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* ── Success: tx submitted, awaiting confirmation ── */}
          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-semibold">Payment submitted</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                We've received your transaction. Please wait while we confirm your payment on-chain — your credits
                will be added automatically once it's verified, usually within a few minutes to a couple of hours.
              </p>
              <button
                onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors"
              >
                Done
              </button>
            </div>
          ) : !deposit ? (
            /* ── Step 1: choose network ── */
            <>
              <p className="text-sm text-slate-400">Choose the network you'll send USDT on:</p>
              <div className="space-y-2">
                {networks.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => setSelected(net.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                      selected === net.id
                        ? 'border-brand-500/50 bg-brand-600/10'
                        : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{net.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{NETWORK_NOTE[net.id] || ''}</p>
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      selected === net.id ? 'border-brand-500 bg-brand-500' : 'border-white/25'
                    }`} />
                  </button>
                ))}
              </div>
              <button
                onClick={createDeposit}
                disabled={!selected || creating}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {creating ? 'Generating address…' : 'Continue'}
              </button>
            </>
          ) : (
            /* ── Step 2: pay + submit tx hash ── */
            <>
              {/* Countdown */}
              <div className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium ${
                expired
                  ? 'bg-red-500/10 border-red-500/20 text-red-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}>
                {expired ? (
                  <span>This deposit window expired. You can still pay — just submit your tx hash, or close and start again.</span>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Send within <span className="font-mono font-bold tabular-nums">{fmtCountdown(remaining)}</span></span>
                  </>
                )}
              </div>

              {/* QR */}
              <div className="flex justify-center">
                <div className="p-2 rounded-xl bg-white">
                  <img src={qrSrc} alt="Deposit address QR" className="w-40 h-40" />
                </div>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8">
                <div>
                  <p className="text-xs text-slate-500">Send exactly</p>
                  <p className="text-lg font-bold text-white">{amount} USDT</p>
                </div>
                <CopyButton value={amount} />
              </div>

              {/* Address */}
              <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">{deposit.network_label} address</p>
                  <CopyButton value={deposit.wallet_address} />
                </div>
                <p className="text-sm text-white font-mono break-all leading-relaxed">{deposit.wallet_address}</p>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Only send <span className="text-slate-300 font-medium">USDT on the {deposit.network_label}</span> network
                to this address. Sending any other asset or network may result in permanent loss.
              </p>

              {/* Tx hash submission */}
              <div className="space-y-2 pt-1">
                <label className="text-sm font-medium text-slate-300">Transaction hash</label>
                <input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste your tx hash after sending"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-slate-600 focus:border-brand-500/50 focus:outline-none font-mono"
                />
                <button
                  onClick={submitTx}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {submitting ? 'Submitting…' : "I've sent it — confirm payment"}
                </button>
                <p className="text-xs text-slate-600 text-center">
                  After you submit, please wait for your payment to be confirmed. Credits are added automatically once verified.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  const { user, credits, setCredits, setUser } = useAuthStore()
  const [ledger, setLedger]             = useState([])
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [loyalty, setLoyalty]           = useState(null)
  const [paymentNotice, setPaymentNotice] = useState(null)   // 'submitted'
  const [depositRequest, setDepositRequest] = useState(null) // opens the USDT deposit modal

  const currentPlan = user?.plan || 'free'
  const isFreePlan  = currentPlan === 'free'
  // Free trial shows usage against the 100-credit baseline; paid accounts just
  // show their balance (credits-only model — no fixed monthly allowance).
  const planLimit   = 100
  const used        = Math.max(0, planLimit - credits)
  const usedPct     = isFreePlan ? Math.min((used / planLimit) * 100, 100) : 0

  // Pull the latest balance + plan from the server and sync them into the store.
  async function refreshBalance() {
    try {
      const { data } = await api.get('/billing/credits/')
      if (typeof data.credits === 'number') setCredits(data.credits)
      if (data.plan && user) setUser({ ...user, plan: data.plan, credits: data.credits })
      api.get('/billing/credits/history/?limit=8').then(({ data }) => setLedger(data.results || data)).catch(() => {})
      api.get('/billing/loyalty/').then(({ data }) => setLoyalty(data)).catch(() => {})
      return data.credits
    } catch {
      return null
    }
  }

  useEffect(() => {
    api.get('/billing/credits/history/?limit=8')
      .then(({ data }) => setLedger(data.results || data))
      .catch(() => {})
      .finally(() => setLedgerLoading(false))
    api.get('/billing/loyalty/')
      .then(({ data }) => setLoyalty(data))
      .catch(() => {})
  }, [])

  // Open the USDT deposit modal for a credit pack.
  function handleBuyPack(packId) {
    const pack = PACKS.find((p) => p.id === packId)
    if (!pack) return
    setDepositRequest({
      type:   'pack',
      pack_id: packId,
      label:  `${pack.credits.toLocaleString()} credit pack`,
      amount: pack.price,
    })
  }

  // Called once the user submits their tx hash — show the pending banner and
  // refresh the balance/history so the new deposit appears.
  function handleDepositSubmitted() {
    setPaymentNotice('submitted')
    refreshBalance()
  }

  const barColor = usedPct > 80 ? 'bg-red-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-brand-500'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Billing</h2>
        <p className="text-sm text-slate-400 mt-1">Buy credits and view your payment history.</p>
      </div>

      {paymentNotice === 'submitted' && (
        <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Payment submitted — please wait while we confirm it on-chain. Your credits will be added automatically once verified.
        </div>
      )}

      <CreditStatusCard plan={currentPlan} credits={credits} />

      <LoyaltyCard loyalty={loyalty} />

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
            Free credits are a one-time signup bonus. Buy a credit pack below to unlock full access — bulk verification, API, teams and more.
          </div>
        )}
      </div>

      {/* Credit pack top-ups */}
      <CreditPacksSection onBuy={handleBuyPack} />

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

      {depositRequest && (
        <CryptoDepositModal
          request={depositRequest}
          onClose={() => setDepositRequest(null)}
          onSubmitted={handleDepositSubmitted}
        />
      )}
    </div>
  )
}
