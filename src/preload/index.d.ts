import { ElectronAPI } from '@electron-toolkit/preload'

export interface AppSettings {
  leftUrl: string
  rightUrl: string
  splitRatio: number
  dividerColor: string
  swapped: boolean
}

export interface AppAPI {
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<boolean>
  openSettings: () => void
  onSettingsUpdated: (callback: (settings: AppSettings) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
