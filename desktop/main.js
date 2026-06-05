const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const DEFAULT_BASE_URL = 'https://bouncetrap.net/api/v1'
const CONFIG_PATH = () => path.join(app.getPath('userData'), 'config.json')

// ── Config persistence ──────────────────────────────────────────────────────
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf-8'))
  } catch {
    return { apiKey: '', baseUrl: DEFAULT_BASE_URL }
  }
}
function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH(), JSON.stringify(cfg, null, 2))
}

// ── API helpers (run in main process → no CORS) ─────────────────────────────
function apiHeaders() {
  const { apiKey } = readConfig()
  return { 'X-API-Key': apiKey }
}
function baseUrl() {
  return (readConfig().baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
}

async function apiGet(path) {
  const res = await fetch(`${baseUrl()}${path}`, { headers: apiHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, detail: data.detail || 'Request failed' }
  return data
}

async function apiPostJson(path, body) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, detail: data.detail || 'Request failed' }
  return data
}

// ── Window ──────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 920,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#0a0a14',
    title: 'BounceTrap',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.setMenuBarVisibility(false)
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC handlers ────────────────────────────────────────────────────────────

ipcMain.handle('config:get', () => {
  const cfg = readConfig()
  // Never expose nothing — but the key is local-only, fine to return to renderer
  return cfg
})

ipcMain.handle('config:save', (_e, cfg) => {
  writeConfig({ apiKey: (cfg.apiKey || '').trim(), baseUrl: (cfg.baseUrl || DEFAULT_BASE_URL).trim() })
  return true
})

ipcMain.handle('credits:get', async () => {
  return apiGet('/billing/credits/')
})

ipcMain.handle('verify:single', async (_e, email) => {
  return apiPostJson('/verify/single/', { email })
})

ipcMain.handle('jobs:list', async () => {
  const data = await apiGet('/verify/jobs/')
  return Array.isArray(data) ? data : (data.results || [])
})

// Bulk upload: read the chosen file and POST as multipart from Node (no CORS)
ipcMain.handle('verify:bulk', async (_e, filePath) => {
  const buf = fs.readFileSync(filePath)
  const name = path.basename(filePath)
  const form = new FormData()
  form.append('file', new Blob([buf]), name)

  const res = await fetch(`${baseUrl()}/verify/bulk/`, {
    method: 'POST',
    headers: apiHeaders(), // do NOT set Content-Type — fetch sets the multipart boundary
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, detail: data.detail || 'Upload failed' }
  return data
})

// Open a file picker for the bulk list
ipcMain.handle('dialog:pickFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choose a CSV or TXT file',
    properties: ['openFile'],
    filters: [{ name: 'Email lists', extensions: ['csv', 'txt'] }],
  })
  return canceled ? null : filePaths[0]
})

// Download a finished job's result CSV to a user-chosen location
ipcMain.handle('jobs:download', async (_e, jobId) => {
  const res = await fetch(`${baseUrl()}/verify/jobs/${jobId}/download/`, { headers: apiHeaders() })
  if (!res.ok) throw { status: res.status, detail: 'Download failed' }
  const buf = Buffer.from(await res.arrayBuffer())

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save results',
    defaultPath: `bouncetrap_results_${String(jobId).slice(0, 8)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  })
  if (canceled || !filePath) return { saved: false }
  fs.writeFileSync(filePath, buf)
  return { saved: true, filePath }
})
