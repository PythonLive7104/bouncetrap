import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function ReferralPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/auth/referral/')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function copyLink() {
    if (!data?.referral_link) return
    navigator.clipboard.writeText(data.referral_link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-5 animate-pulse">
        <div className="h-6 w-48 rounded bg-white/8" />
        <div className="h-32 rounded-2xl bg-white/5" />
        <div className="h-32 rounded-2xl bg-white/5" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Referral Program</h2>
        <p className="text-sm text-slate-400 mt-1">
          Share your referral link. When someone signs up using your link, you both receive
          <span className="text-white font-semibold"> 1,000 bonus credits</span> — instantly.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total referrals', value: data?.total_referrals ?? 0 },
          { label: 'Credits earned',  value: (data?.credits_earned ?? 0).toLocaleString() },
          { label: 'Per signup',      value: (data?.bonus_per_signup ?? 1000).toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4 text-center">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Referral link card */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-white font-semibold text-sm">Your referral link</h3>

        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={data?.referral_link || ''}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm font-mono focus:outline-none select-all"
          />
          <button
            onClick={copyLink}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-brand-600 hover:bg-brand-500 text-white'
            }`}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Or share your code:</span>
          <span className="font-mono text-sm font-bold text-brand-300 bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-lg">
            {data?.referral_code}
          </span>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <h3 className="text-white font-semibold text-sm mb-5">How it works</h3>
        <div className="space-y-4">
          {[
            {
              step: '1',
              title: 'Share your link',
              desc: 'Send your referral link to colleagues, communities, or your audience.',
              color: 'bg-brand-600',
            },
            {
              step: '2',
              title: 'They sign up',
              desc: 'Your friend creates a BounceTrap account using your link or code.',
              color: 'bg-brand-600',
            },
            {
              step: '3',
              title: 'You both get 1,000 credits',
              desc: 'Instantly credited to both accounts — no minimum purchase required.',
              color: 'bg-emerald-600',
            },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="flex items-start gap-4">
              <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>
                {step}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms */}
      <p className="text-xs text-slate-600 px-1">
        Referral credits are added automatically on signup. There is no limit to how many people you can refer.
        Credits never expire. Abuse of the referral system may result in account suspension.
      </p>
    </div>
  )
}
