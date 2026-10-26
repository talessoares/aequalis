const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kubaAPI', {
  hidList: () => ipcRenderer.invoke('hid:list'),
  hidOpen: () => ipcRenderer.invoke('hid:open'),
  hidClose: () => ipcRenderer.invoke('hid:close'),
  hidApply: (bands, pre) => ipcRenderer.invoke('hid:apply', { bands, pre }),
  onHidProgress: (callback) => ipcRenderer.on('hid:progress', (event, progress) => callback(progress)),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  curveImport: () => ipcRenderer.invoke('curve:import'),
  curveExport: (curve) => ipcRenderer.invoke('curve:export', curve),
  setCloseToTray: (enabled) => ipcRenderer.invoke('settings:set-close-to-tray', enabled),
  setTrayCurves: (curves) => ipcRenderer.invoke('tray:set-curves', curves),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  onTraySelectCurve: (callback) => ipcRenderer.on('tray:select-curve', (event, id) => callback(id)),
});
