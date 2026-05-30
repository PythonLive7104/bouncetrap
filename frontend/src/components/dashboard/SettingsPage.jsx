import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

const TIMEZONES = [
  'UTC', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Accra', 'Africa/Cairo',
  'Africa/Johannesburg', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
]

function SectionHeader({ title, description }) {
  return (
    <div className="mb-5">
      <h3 className="text-white font-semibold text-base">{title}</h3>
      {description && <p className="text-slate-500 text-sm mt-0.5">{description}</p>}
    </div>
  )
}

function SaveButton({ loading, saved, label = 'Save changes' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-wait text-white text-sm font-semibold transition-colors"
    >
      {loading ? 'Saving…' : saved ? 'Saved!' : label}
    </button>
  )
}

function SuccessBanner({ message }) {
  if (!message) return null
  return (
    <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
      {message}
    </div>
  )
}

// ── Profile section ────────────────────────────────────────────────────────
function ProfileSection() {
  const { user, setAuth } = useAuthStore()
  const token = useAuthStore((s) => s.token)

  const [fullName, setFullName]   = useState(user?.full_name || '')
  const [timezone, setTimezone]   = useState(user?.timezone || 'UTC')
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState('')
  const [error, setError]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    setError('')
    try {
      const { data } = await api.patch('/auth/profile/', { full_name: fullName, timezone })
      setAuth({ ...user, ...data }, token)
      setSuccess('Profile updated.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <SectionHeader title="Profile" description="Your public name and timezone." />
      <SuccessBanner message={success} />
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Email address</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full sm:w-96 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/8 text-slate-500 text-sm cursor-not-allowed"
          />
          <p className="text-xs text-slate-600 mt-1">Email cannot be changed.</p>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="w-full sm:w-96 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full sm:w-96 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz} className="bg-[#1a1a2e]">{tz}</option>
            ))}
          </select>
        </div>

        <div className="pt-1">
          <SaveButton loading={loading} saved={success !== ''} />
        </div>
      </form>
    </div>
  )
}

// ── Password section ───────────────────────────────────────────────────────
function PasswordSection() {
  const [form, setForm]       = useState({ current_password: '', new_password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')
  const [show, setShow]       = useState({ current: false, new: false, confirm: false })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSuccess('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.new_password !== form.confirm) {
      setError('New passwords do not match.')
      return
    }
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setSuccess('')
    setError('')
    try {
      await api.post('/auth/change-password/', {
        current_password: form.current_password,
        new_password:     form.new_password,
      })
      setSuccess('Password changed successfully.')
      setForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.current_password?.[0] ||
        data?.new_password?.[0] ||
        data?.detail ||
        'Could not change password.'
      )
    } finally {
      setLoading(false)
    }
  }

  function EyeToggle({ field }) {
    return (
      <button
        type="button"
        onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
      >
        {show[field] ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <SectionHeader title="Password" description="Keep your account secure with a strong password." />
      <SuccessBanner message={success} />
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { field: 'current_password', label: 'Current password', key: 'current' },
          { field: 'new_password',     label: 'New password',     key: 'new' },
          { field: 'confirm',          label: 'Confirm new password', key: 'confirm' },
        ].map(({ field, label, key }) => (
          <div key={field}>
            <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
            <div className="relative w-full sm:w-96">
              <input
                type={show[key] ? 'text' : 'password'}
                value={form[field]}
                onChange={(e) => update(field, e.target.value)}
                required
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition"
              />
              <EyeToggle field={key} />
            </div>
          </div>
        ))}
        <div className="pt-1">
          <SaveButton loading={loading} saved={success !== ''} label="Update password" />
        </div>
      </form>
    </div>
  )
}

// ── Notifications section ──────────────────────────────────────────────────
function NotificationsSection() {
  const { user, setAuth } = useAuthStore()
  const token = useAuthStore((s) => s.token)

  const [prefs, setPrefs]     = useState({
    notify_low_credits:  user?.notify_low_credits  ?? true,
    notify_job_complete: user?.notify_job_complete ?? true,
    notify_blacklist:    user?.notify_blacklist    ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')

  function toggle(key) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
    setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    setError('')
    try {
      const { data } = await api.patch('/auth/profile/', prefs)
      setAuth({ ...user, ...data }, token)
      setSuccess('Notification preferences saved.')
    } catch {
      setError('Could not save preferences.')
    } finally {
      setLoading(false)
    }
  }

  const ITEMS = [
    {
      key: 'notify_low_credits',
      label: 'Low credit warning',
      description: 'Alert when you have used 80% or more of your plan credits.',
    },
    {
      key: 'notify_job_complete',
      label: 'Bulk job complete',
      description: 'Notify when a bulk verification job finishes processing.',
    },
    {
      key: 'notify_blacklist',
      label: 'Blacklist alerts',
      description: 'Alert when one of your monitored domains appears on a blacklist.',
    },
  ]

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <SectionHeader title="Notifications" description="Choose which email alerts you want to receive." />
      <SuccessBanner message={success} />
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-0">
        {ITEMS.map(({ key, label, description }, i) => (
          <div
            key={key}
            className={`flex items-center justify-between py-4 gap-6 ${i < ITEMS.length - 1 ? 'border-b border-white/5' : ''}`}
          >
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(key)}
              className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${prefs[key] ? 'bg-brand-600' : 'bg-white/15'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${prefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
        <div className="pt-4">
          <SaveButton loading={loading} saved={success !== ''} label="Save preferences" />
        </div>
      </form>
    </div>
  )
}

// ── Account info section ───────────────────────────────────────────────────
function AccountInfoSection() {
  const { user } = useAuthStore()

  const PLAN_COLORS = {
    free:    'text-slate-400 bg-slate-500/10 border-slate-500/20',
    starter: 'text-brand-300 bg-brand-500/10 border-brand-500/20',
    growth:  'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    pro:     'text-amber-300 bg-amber-500/10 border-amber-500/20',
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <SectionHeader title="Account" description="Read-only account details." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'User ID',      value: String(user?.id).slice(0, 8) + '…' },
          { label: 'Email',        value: user?.email },
          {
            label: 'Plan',
            value: (
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${PLAN_COLORS[user?.plan] || PLAN_COLORS.free}`}>
                {user?.plan || 'free'}
              </span>
            ),
          },
          { label: 'Credits',      value: (user?.credits ?? 0).toLocaleString() },
          { label: 'Timezone',     value: user?.timezone || 'UTC' },
          { label: 'Email verified', value: user?.email_verified ? 'Yes' : 'No' },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-sm text-white font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Webhooks section ───────────────────────────────────────────────────────
function WebhookSection() {
  const { user, setAuth } = useAuthStore()
  const token = useAuthStore((s) => s.token)

  const [url, setUrl]           = useState(user?.webhook_url || '')
  const [secret, setSecret]     = useState(user?.webhook_secret || '')
  const [showSecret, setShowSecret] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)

  function generateSecret() {
    const arr = new Uint8Array(24)
    crypto.getRandomValues(arr)
    const raw = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
    setSecret(raw)
    setSuccess('')
  }

  function copySecret() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    setError('')
    try {
      const { data } = await api.patch('/auth/profile/', { webhook_url: url, webhook_secret: secret })
      setAuth({ ...user, ...data }, token)
      setSuccess('Webhook settings saved.')
    } catch (err) {
      setError(err.response?.data?.webhook_url?.[0] || err.response?.data?.detail || 'Could not save webhook settings.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <SectionHeader title="Developer / Webhooks" description="BounceTrap will POST a signed payload to your URL after each bulk job completes." />
      <SuccessBanner message={success} />
      <ErrorBanner message={error} />

      <div className="mb-5 p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 text-sm text-slate-400">
        <p className="font-medium text-brand-300 mb-1">Payload example</p>
        <pre className="text-xs text-slate-500 overflow-x-auto">{`{
  "event": "job.complete",
  "job_id": "...",
  "status": "done",
  "total": 500,
  "valid": 412,
  "invalid": 63,
  "risky": 15,
  "unknown": 10,
  "credits_used": 500,
  "completed_at": "2026-01-01T12:00:00Z"
}`}</pre>
        <p className="mt-2 text-xs">Verify the <code className="text-brand-300">X-BounceTrap-Signature</code> header: <code className="text-brand-300">sha256=HMAC_SHA256(secret, body)</code></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Webhook URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setSuccess('') }}
            placeholder="https://yourapp.com/webhooks/bouncetrap"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Signing secret</label>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-0">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => { setSecret(e.target.value); setSuccess('') }}
                placeholder="Generate or paste a secret"
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showSecret ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={generateSecret}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-sm font-medium transition-colors whitespace-nowrap"
            >
              Regenerate
            </button>
            {secret && (
              <button
                type="button"
                onClick={copySecret}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-sm font-medium transition-colors whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">Store this secret securely — you won't be able to view it again after saving unless you show the field.</p>
        </div>

        <div className="pt-1">
          <SaveButton loading={loading} saved={success !== ''} label="Save webhook settings" />
        </div>
      </form>
    </div>
  )
}

// ── Danger zone ────────────────────────────────────────────────────────────
function DangerZoneSection() {
  const [confirm, setConfirm] = useState('')
  const [open, setOpen]       = useState(false)
  const { user, logout }      = useAuthStore()

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6">
      <SectionHeader title="Danger zone" description="Irreversible actions — proceed carefully." />

      <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-white">Delete account</p>
          <p className="text-xs text-slate-500 mt-0.5">Permanently remove your account, all jobs, and all data. This cannot be undone.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors shrink-0"
        >
          Delete account
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#12121f] border border-white/10 p-6 shadow-2xl">
            <h3 className="text-white font-bold text-base mb-2">Delete your account?</h3>
            <p className="text-slate-400 text-sm mb-4">
              This will permanently delete all your data, jobs, and credits. Type your email to confirm.
            </p>
            <input
              type="email"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={user?.email}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-red-500/50 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setOpen(false); setConfirm('') }}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={confirm !== user?.email}
                onClick={() => {
                  // TODO: call DELETE /auth/profile/ then logout
                  logout()
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Manage your profile, password, and preferences.</p>
      </div>

      <AccountInfoSection />
      <ProfileSection />
      <PasswordSection />
      <NotificationsSection />
      <WebhookSection />
      <DangerZoneSection />
    </div>
  )
}
