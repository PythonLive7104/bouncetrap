import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import SubscriptionExpiredModal from './SubscriptionExpiredModal'

// Pull a readable message out of an axios error. DRF returns `{detail: "..."}`
// for APIException, but serializer validation returns field arrays like
// `{file: ["Only .csv and .txt files are accepted."]}` — surface those too so
// the user sees the real reason instead of a generic "try again".
function extractError(err) {
  if (!err.response) return 'Network error — check your connection and try again.'
  const data = err.response.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (data && typeof data === 'object') {
    const first = Object.values(data).flat().find((v) => typeof v === 'string')
    if (first) return first
  }
  if (err.response.status >= 500) return 'Server error while processing the upload. Please try again or contact support.'
  return 'Upload failed. Please try again.'
}

const STATUS_BADGE = {
  queued:     { label: 'Queued',     cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  processing: { label: 'Processing', cls: 'bg-brand-500/15 text-brand-400 border-brand-500/30', pulse: true },
  paused:     { label: 'Paused',     cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  done:       { label: 'Done',       cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  failed:     { label: 'Failed',     cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-slate-600/15 text-slate-500 border-slate-600/30' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.queued
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.cls}`}>
      {cfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />}
      {cfg.label}
    </span>
  )
}

function ProgressBar({ processed, total }) {
  const pct = total > 0 ? Math.min(Math.round((processed / total) * 100), 100) : 0
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span>{processed.toLocaleString()} / {total.toLocaleString()} emails</span>
        <span className="font-medium text-brand-400">{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/8">
        <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Credits-only model: 'free' (trial) and 'paid'. Paid is limited by credits,
// not a fixed row cap, so we show a generous ceiling.
const PLAN_MAX_ROWS = {
  free: 20,
  paid: 1_000_000,
}

function UploadZone({ onUpload, uploading, plan }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [filename, setFilename] = useState('')
  const rowLimit = PLAN_MAX_ROWS[plan] ?? 100

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) { setFilename(file.name); onUpload(file) }
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) { setFilename(file.name); onUpload(file) }
    e.target.value = ''
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer p-12 text-center select-none ${
        drag
          ? 'border-brand-400 bg-brand-500/8 scale-[1.005]'
          : uploading
            ? 'border-brand-600/40 bg-brand-600/5 cursor-default'
            : 'border-white/10 bg-white/[0.015] hover:border-brand-500/50 hover:bg-white/[0.03]'
      }`}
    >
      <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleChange} />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-10 h-10 text-brand-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="text-white font-medium text-sm">Uploading {filename}…</p>
            <p className="text-slate-500 text-xs mt-1">Your job will start automatically</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${drag ? 'bg-brand-500/20' : 'bg-white/5'}`}>
            <svg className={`w-7 h-7 transition-colors ${drag ? 'text-brand-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">
              {drag ? 'Drop to upload' : 'Drop your file here or click to browse'}
            </p>
            <p className="text-slate-500 text-xs mt-1">Supports CSV and TXT — one email per line or column</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-slate-600" />Max {rowLimit.toLocaleString()} emails</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-slate-600" />Auto-deduplication</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-slate-600" />CSV results download</span>
          </div>
          {plan === 'free' && (
            <p className="text-xs text-amber-400/70">
              Free plan — up to 20 emails per job, shared with your daily single-verify limit.{' '}
              <Link to="/dashboard/billing" className="text-amber-400 hover:underline">Upgrade for 5,000+</Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const GRADE_STYLES = {
  A: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  B: 'bg-teal-500/15    text-teal-300    border-teal-500/30',
  C: 'bg-amber-500/15   text-amber-300   border-amber-500/30',
  D: 'bg-orange-500/15  text-orange-300  border-orange-500/30',
  F: 'bg-red-500/15     text-red-300     border-red-500/30',
}

function HealthBadge({ grade }) {
  if (!grade) return null
  const cls = GRADE_STYLES[grade] || GRADE_STYLES.F
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-bold ${cls}`}>
      Grade {grade}
    </span>
  )
}

function JobRow({ job, onCancel, onPause, onResume, onDownload, onDownloadZip, onDownloadReport, userPlan }) {
  const fmt = (n) => (n ?? 0).toLocaleString()
  const isDone      = job.status === 'done'
  const isActive    = job.status === 'queued' || job.status === 'processing'
  const isPaused    = job.status === 'paused'
  const isFailed    = job.status === 'failed'
  const canReport   = isDone && userPlan === 'paid'

  const total   = job.total_count   || 0
  const valid   = job.valid_count   || 0
  const invalid = job.invalid_count || 0
  const risky   = job.risky_count   || 0
  const unknown = job.unknown_count || 0
  const validPct = total > 0 ? Math.round((valid / total) * 100) : 0

  const ActionButtons = () => (
    <>
      {isActive && (
        <>
          <button onClick={() => onPause(job.id)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-colors">
            Pause
          </button>
          <button onClick={() => onCancel(job.id)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors">
            Cancel
          </button>
        </>
      )}
      {isPaused && (
        <>
          <button onClick={() => onResume(job.id)}
            className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors font-medium">
            Resume
          </button>
          <button onClick={() => onCancel(job.id)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors">
            Cancel
          </button>
        </>
      )}
      {isDone && (
        <>
          {canReport && (
            <button onClick={() => onDownloadReport(job.id)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF Report
            </button>
          )}
          <button onClick={() => onDownloadZip(job.id)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Split ZIP
          </button>
          <button onClick={() => onDownload(job.id)}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </button>
        </>
      )}
    </>
  )

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5 hover:bg-white/[0.015] transition-colors">

      {/* Header row: icon + name/date + badges (desktop: actions inline right) */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {/* Filename + date */}
          <p className="text-white text-sm font-semibold truncate">{job.filename}</p>
          <p className="text-slate-600 text-xs mt-0.5">{new Date(job.created_at).toLocaleString()}</p>

          {/* Badges on their own line so they never collide with filename */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <StatusBadge status={job.status} />
            {isDone && job.health_grade && <HealthBadge grade={job.health_grade} />}
          </div>
        </div>

        {/* Actions — visible inline on sm+ screens only */}
        <div className="hidden sm:flex items-center gap-2 shrink-0 pt-0.5">
          <ActionButtons />
        </div>
      </div>

      {/* Progress / results */}
      <div className="ml-11">
        {(isActive || isPaused) && (
          <ProgressBar processed={job.processed_count || 0} total={total} />
        )}

        {isDone && (
          <div className="mt-2.5">
            {total > 0 && (
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-2.5">
                <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${Math.round(valid/total*100)}%` }} title={`${valid} valid`} />
                <div className="bg-red-500 transition-all" style={{ width: `${Math.round(invalid/total*100)}%` }} title={`${invalid} invalid`} />
                <div className="bg-amber-500 transition-all" style={{ width: `${Math.round(risky/total*100)}%` }} title={`${risky} risky`} />
                <div className="bg-slate-600 rounded-r-full transition-all" style={{ width: `${Math.round(unknown/total*100)}%` }} title={`${unknown} unknown`} />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-slate-400 font-medium">{fmt(total)} total</span>
              <span className="text-emerald-400">{fmt(valid)} valid <span className="text-slate-600">({validPct}%)</span></span>
              <span className="text-red-400">{fmt(invalid)} invalid</span>
              <span className="text-amber-400">{fmt(risky)} risky</span>
              {unknown > 0 && <span className="text-slate-500">{fmt(unknown)} unknown</span>}
            </div>
            {job.health_advice?.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {job.health_advice.map((tip, i) => (
                  <p key={i} className="text-xs text-slate-500 flex gap-1.5">
                    <span className="text-slate-600 mt-0.5">→</span>{tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {isFailed && job.error_message && (
          <p className="mt-1 text-xs text-red-400">{job.error_message}</p>
        )}
      </div>

      {/* Actions — full-width row on mobile only */}
      <div className="flex sm:hidden items-center gap-2 mt-3 justify-end">
        <ActionButtons />
      </div>

    </div>
  )
}

export default function BulkJobsPage() {
  const { user } = useAuthStore()
  const [jobs, setJobs]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const pollRef = useRef(null)

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get('/verify/jobs/')
      setJobs(data.results ?? data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchJobs()
    pollRef.current = setInterval(() => {
      setJobs((prev) => {
        const hasActive = prev.some((j) => j.status === 'queued' || j.status === 'processing')
        if (hasActive) fetchJobs()
        return prev
      })
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [fetchJobs])

  async function handleUpload(file) {
    setUploading(true); setUploadError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post('/verify/bulk/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await fetchJobs()
    } catch (err) {
      if (err.response?.status === 429) {
        setUploadError(err.response.data?.detail || 'Daily limit reached. Try again tomorrow or upgrade your plan.')
      } else if (err.response?.status === 402 && err.response?.data?.detail?.includes('subscription')) {
        setShowExpiredModal(true)
      } else {
        setUploadError(extractError(err))
      }
    } finally { setUploading(false) }
  }

  async function handleCancel(id) {
    try { await api.post(`/verify/jobs/${id}/cancel/`); fetchJobs() } catch {}
  }

  async function handlePause(id) {
    try { await api.post(`/verify/jobs/${id}/pause/`); fetchJobs() } catch {}
  }

  async function handleResume(id) {
    try { await api.post(`/verify/jobs/${id}/resume/`); fetchJobs() } catch {}
  }

  async function handleDownload(id) {
    try {
      const res = await api.get(`/verify/jobs/${id}/download/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `bouncetrap_results_${id.slice(0, 8)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed. Please try again.') }
  }

  async function handleDownloadZip(id) {
    try {
      const res = await api.get(`/verify/jobs/${id}/download-zip/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `bouncetrap_results_${id.slice(0, 8)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed. Please try again.') }
  }

  async function handleDownloadReport(id) {
    try {
      const res = await api.get(`/verify/jobs/${id}/report/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `bouncetrap_report_${id.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'PDF reports are available on Growth plan and above.'
        : 'Report generation failed. Please try again.'
      alert(msg)
    }
  }

  const doneJobs       = jobs.filter((j) => j.status === 'done')
  const activeJobs     = jobs.filter((j) => j.status === 'queued' || j.status === 'processing')
  const totalVerified  = doneJobs.reduce((s, j) => s + (j.total_count || 0), 0)

  return (
    <div className="space-y-6">
      {showExpiredModal && <SubscriptionExpiredModal onClose={() => setShowExpiredModal(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Bulk Verification</h2>
          <p className="text-sm text-slate-400 mt-1">Upload a CSV or TXT list — every address gets a full 10-step check and you download the results.</p>
        </div>
        {doneJobs.length > 0 && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-white">{totalVerified.toLocaleString()}</p>
            <p className="text-xs text-slate-500">emails verified total</p>
          </div>
        )}
      </div>

      {/* Upload zone */}
      <UploadZone onUpload={handleUpload} uploading={uploading} plan={user?.plan} />

      {uploadError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {uploadError}
        </div>
      )}

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <div className="rounded-2xl border border-brand-800/30 bg-brand-950/20 overflow-hidden">
          <div className="px-6 py-3.5 border-b border-brand-800/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <h3 className="text-brand-300 font-semibold text-sm">{activeJobs.length} job{activeJobs.length > 1 ? 's' : ''} in progress</h3>
          </div>
          <div className="divide-y divide-white/5">
            {activeJobs.map((job) => (
              <JobRow key={job.id} job={job} onCancel={handleCancel} onPause={handlePause} onResume={handleResume} onDownload={handleDownload} onDownloadZip={handleDownloadZip} onDownloadReport={handleDownloadReport} userPlan={user?.plan} />
            ))}
          </div>
        </div>
      )}

      {/* All jobs */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">All Jobs</h3>
          {jobs.length > 0 && <span className="text-xs text-slate-600">{jobs.length} total</span>}
        </div>

        {loading ? (
          <div className="divide-y divide-white/5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-5 flex gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-white/8" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-white/8" />
                  <div className="h-3 w-64 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-1">No jobs yet</h3>
            <p className="text-slate-500 text-sm">Upload your first email list above to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onCancel={handleCancel} onPause={handlePause} onResume={handleResume} onDownload={handleDownload} onDownloadZip={handleDownloadZip} onDownloadReport={handleDownloadReport} userPlan={user?.plan} />
            ))}
          </div>
        )}
      </div>

      {/* Format guide */}
      {(
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-5">
          <h4 className="text-white font-semibold text-sm mb-3">File format guide</h4>
          <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-400">
            <div>
              <p className="text-slate-300 font-medium mb-1.5">TXT — one email per line</p>
              <div className="font-mono bg-black/30 rounded-lg p-3 space-y-0.5 text-slate-400 border border-white/8">
                <p>john@company.com</p>
                <p>jane@example.org</p>
                <p>info@startup.io</p>
              </div>
            </div>
            <div>
              <p className="text-slate-300 font-medium mb-1.5">CSV — auto-detects email column</p>
              <div className="font-mono bg-black/30 rounded-lg p-3 space-y-0.5 text-slate-400 border border-white/8">
                <p className="text-slate-500">name,email,company</p>
                <p>John,john@co.com,Acme</p>
                <p>Jane,jane@ex.org,Corp</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
