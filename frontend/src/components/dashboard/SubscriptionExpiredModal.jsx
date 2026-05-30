import { useNavigate } from 'react-router-dom'

export default function SubscriptionExpiredModal({ onClose }) {
  const navigate = useNavigate()

  function renew() {
    onClose()
    navigate('/dashboard/billing')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#12121f] border border-white/10 shadow-2xl overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-amber-500 to-brand-500" />

        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Heading */}
          <h2 className="text-white font-bold text-lg mb-1">Subscription expired</h2>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            Your subscription has lapsed and your credits are currently locked.
          </p>

          {/* Info box */}
          <div className="px-4 py-3 rounded-xl bg-brand-500/8 border border-brand-500/20 mb-5 flex items-start gap-3">
            <svg className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-brand-300/80 text-xs leading-relaxed">
              Your credits <span className="font-semibold text-brand-300">never expire</span>. They will be
              unlocked immediately once you renew any paid plan — even the Starter plan at $20/mo.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={renew}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors"
            >
              Renew subscription
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 text-sm font-medium transition-colors border border-white/8"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
