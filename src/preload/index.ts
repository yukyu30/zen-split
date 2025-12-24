import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 設定の型定義
export interface AppSettings {
  leftUrl: string
  rightUrl: string
  splitRatio: number
  dividerColor: string
  swapped: boolean
}

// Custom APIs for renderer
const api = {
  // 設定を取得
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),

  // 設定を保存
  saveSettings: (settings: AppSettings): Promise<boolean> =>
    ipcRenderer.invoke('save-settings', settings),

  // 設定ウィンドウを開く
  openSettings: (): void => ipcRenderer.send('open-settings'),

  // splitRatioをリアルタイム更新（ドラッグ中）
  updateSplitRatio: (ratio: number): void => ipcRenderer.send('update-split-ratio', ratio),

  // 設定更新の通知を受け取る
  onSettingsUpdated: (callback: (settings: AppSettings) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, settings: AppSettings): void => {
      callback(settings)
    }
    ipcRenderer.on('settings-updated', handler)
    return () => {
      ipcRenderer.removeListener('settings-updated', handler)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
