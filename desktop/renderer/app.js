const API = window.bouncetrap

const $ = (id) => document.getElementById(id)
const show = (el) => el.classList.remove('hidden')
const hide = (el) => el.classList.add('hidden')

let pollTimer = null

// ── Boot ────────────────────────────────────────────────────────────────────
async function boot() {
  const cfg = await API.getConfig()
  if (cfg.apiKey) {
    const ok = await tryLoadCredits()
    if (ok) return enterApp()
  }
  enterSetup(cfg)
}

function enterSetup(cfg = {}) {
  $('setup-url').value = cfg.baseUrl || 'https://bouncetrap.net/api/v1'
  hide($('app')); show($('setup'))
}

function enterApp() {
  hide($('setup')); show($('app'))
  refreshCredits()
  loadJobs()
}

// ── Setup / connect ───────────────────────────────────────────────────────────
$('setup-connect').addEventListener('click', async () => {
  const apiKey = $('setup-key').value.trim()
  const baseUrl = $('setup-url').value.trim()
  hide($('setup-error'))
  if (!apiKey) { return showErr($('setup-error'), 'Please enter your API key.') }
  await API.saveConfig({ apiKey, baseUrl })
  const ok = await tryLoadCredits()
  if (ok) enterApp()
  else showErr($('setup-error'), 'Could not connect. Check your API key and URL.')
})

async function tryLoadCredits() {
  try { await API.getCredits(); return true } catch { return false }
}

// ── Credits ───────────────────────────────────────────────────────────────────
async function refreshCredits() {
  try {
    const data = await API.getCredits()
    $('credits-value').textContent = (data.credits ?? 0).toLocaleString()
  } catch {
    $('credits-value').textContent = '—'
  }
}
$('credits-pill').addEventListener('click', refreshCredits)

// ── Tabs ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'))
    tab.classList.add('active')
    $(`tab-${tab.dataset.tab}`).classList.add('active')
    if (tab.dataset.tab === 'bulk') loadJobs()
  })
})

// ── Single verify ─────────────────────────────────────────────────────────────
const STATUS_DESC = {
  valid: 'Valid and deliverable',
  invalid: 'Invalid or undeliverable',
  risky: 'Exists but delivery is uncertain',
  unknown: 'Could not be determined',
}

$('single-go').addEventListener('click', verifySingle)
$('single-email').addEventListener('keydown', (e) => { if (e.key === 'Enter') verifySingle() })

async function verifySingle() {
  const email = $('single-email').value.trim()
  if (!email) return
  hide($('single-error')); hide($('single-result'))
  $('single-go').disabled = true; $('single-go').textContent = 'Verifying…'
  try {
    const r = await API.verifySingle(email)
    renderResult(r)
    if (typeof r.credits_remaining === 'number') $('credits-value').textContent = r.credits_remaining.toLocaleString()
  } catch (err) {
    showErr($('single-error'), errText(err))
  } finally {
    $('single-go').disabled = false; $('single-go').textContent = 'Verify'
  }
}

function renderResult(r) {
  const status = r.status || 'unknown'
  const cell = (label, val) => val === undefined || val === null || val === ''
    ? '' : `<div class="result-cell"><span>${label}</span><span>${val}</span></div>`
  const yn = (v) => v === true ? 'Yes' : v === false ? 'No' : '—'
  $('single-result').innerHTML = `
    <div class="result-hero">
      <div>
        <div class="result-email">${escapeHtml(r.email || '')}</div>
        <div class="muted" style="margin-top:4px">${STATUS_DESC[status] || ''}</div>
        <span class="badge ${status}" style="margin-top:10px">${status.toUpperCase()}</span>
      </div>
      <div class="score">${r.score ?? 0}</div>
    </div>
    <div class="result-grid">
      ${cell('Domain', escapeHtml(r.domain))}
      ${cell('ESP', escapeHtml(r.esp))}
      ${cell('MX found', yn(r.mx_found))}
      ${cell('SMTP valid', yn(r.smtp_valid))}
      ${cell('Disposable', yn(r.is_disposable))}
      ${cell('Role-based', yn(r.is_role_based))}
      ${cell('Catch-all', yn(r.is_catch_all))}
      ${cell('Free email', yn(r.is_free_email))}
    </div>`
  show($('single-result'))
}

// ── Bulk ──────────────────────────────────────────────────────────────────────
$('bulk-pick').addEventListener('click', pickAndUpload)
$('jobs-refresh').addEventListener('click', loadJobs)

async function pickAndUpload() {
  hide($('bulk-error'))
  const filePath = await API.pickFile()
  if (!filePath) return
  $('bulk-pick').disabled = true; $('bulk-pick').textContent = 'Uploading…'
  try {
    await API.verifyBulk(filePath)
    await loadJobs()
  } catch (err) {
    showErr($('bulk-error'), errText(err))
  } finally {
    $('bulk-pick').disabled = false; $('bulk-pick').textContent = 'Browse file'
  }
}

async function loadJobs() {
  try {
    const jobs = await API.listJobs()
    renderJobs(jobs)
    // Auto-poll while any job is active
    const active = jobs.some((j) => j.status === 'queued' || j.status === 'processing')
    clearTimeout(pollTimer)
    if (active) pollTimer = setTimeout(loadJobs, 3000)
  } catch (err) {
    $('jobs-list').innerHTML = `<p class="error">${errText(err)}</p>`
  }
}

function renderJobs(jobs) {
  if (!jobs.length) {
    $('jobs-list').innerHTML = '<p class="muted empty">No jobs yet. Upload a file to start.</p>'
    return
  }
  $('jobs-list').innerHTML = jobs.map((j) => {
    const total = j.total_count || 0
    const processed = j.processed_count || 0
    const pct = total ? Math.min(Math.round((processed / total) * 100), 100) : 0
    const active = j.status === 'queued' || j.status === 'processing'
    const done = j.status === 'done'
    return `
      <div class="job">
        <div class="job-top">
          <div>
            <div class="job-name">${escapeHtml(j.filename || 'Job')}</div>
            <div class="job-meta">${new Date(j.created_at).toLocaleString()}</div>
          </div>
          <span class="job-status ${j.status}">${j.status}</span>
        </div>
        ${active ? `
          <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
          <div class="job-meta" style="margin-top:6px">${processed.toLocaleString()} / ${total.toLocaleString()} · ${pct}%</div>
        ` : ''}
        ${done ? `
          <div class="job-stats">
            <span>${total.toLocaleString()} total</span>
            <span class="valid">${(j.valid_count||0).toLocaleString()} valid</span>
            <span class="invalid">${(j.invalid_count||0).toLocaleString()} invalid</span>
            <span class="risky">${(j.risky_count||0).toLocaleString()} risky</span>
          </div>
          <div class="job-actions"><button class="btn-secondary" data-download="${j.id}">Download CSV</button></div>
        ` : ''}
        ${j.status === 'failed' && j.error_message ? `<div class="error">${escapeHtml(j.error_message)}</div>` : ''}
      </div>`
  }).join('')

  document.querySelectorAll('[data-download]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Saving…'
      try {
        const res = await API.downloadJob(btn.dataset.download)
        btn.textContent = res.saved ? 'Saved ✓' : 'Download CSV'
      } catch (err) {
        btn.textContent = 'Failed'
        alert(errText(err))
      } finally {
        setTimeout(() => { btn.disabled = false; if (btn.textContent !== 'Saved ✓') btn.textContent = 'Download CSV' }, 1500)
      }
    })
  })
}

// ── Settings ──────────────────────────────────────────────────────────────────
$('btn-settings').addEventListener('click', async () => {
  const cfg = await API.getConfig()
  $('settings-key').value = cfg.apiKey || ''
  $('settings-url').value = cfg.baseUrl || 'https://bouncetrap.net/api/v1'
  show($('settings-modal'))
})
$('settings-cancel').addEventListener('click', () => hide($('settings-modal')))
$('settings-save').addEventListener('click', async () => {
  await API.saveConfig({ apiKey: $('settings-key').value.trim(), baseUrl: $('settings-url').value.trim() })
  hide($('settings-modal'))
  refreshCredits()
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function showErr(el, msg) { el.textContent = msg; show(el) }
function errText(err) {
  if (err && err.status === 401) return 'Invalid API key. Open Settings to update it.'
  if (err && err.status === 402) return 'Insufficient credits. Top up on bouncetrap.net.'
  if (err && err.status === 403) return err.detail || 'Not allowed on your plan.'
  if (err && err.status === 429) return 'Rate limit or daily limit reached. Try again later.'
  return (err && err.detail) || 'Something went wrong. Check your connection.'
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

boot()
