const { contextBridge, ipcRenderer } = require('electron')

// Safe bridge — the renderer never touches Node or the API key directly.
contextBridge.exposeInMainWorld('bouncetrap', {
  getConfig:    ()        => ipcRenderer.invoke('config:get'),
  saveConfig:   (cfg)     => ipcRenderer.invoke('config:save', cfg),
  getCredits:   ()        => ipcRenderer.invoke('credits:get'),
  verifySingle: (email)   => ipcRenderer.invoke('verify:single', email),
  listJobs:     ()        => ipcRenderer.invoke('jobs:list'),
  verifyBulk:   (path)    => ipcRenderer.invoke('verify:bulk', path),
  pickFile:     ()        => ipcRenderer.invoke('dialog:pickFile'),
  downloadJob:  (jobId)   => ipcRenderer.invoke('jobs:download', jobId),
})
