import { app, shell, BaseWindow, WebContentsView, ipcMain, Menu, session } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// 設定の型定義
interface AppSettings {
  leftUrl: string
  rightUrl: string
  splitRatio: number
  dividerColor: string
  swapped: boolean
}

// デフォルト設定
const defaultSettings: AppSettings = {
  leftUrl: '',
  rightUrl: '',
  splitRatio: 50,
  dividerColor: '#3c3c3c',
  swapped: false
}

// 設定ファイルのパス
function getSettingsPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'settings.json')
}

// 設定を読み込む
function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath()
  try {
    if (existsSync(settingsPath)) {
      const data = readFileSync(settingsPath, 'utf-8')
      return { ...defaultSettings, ...JSON.parse(data) }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
  return { ...defaultSettings }
}

// 設定を保存する
function saveSettings(settings: AppSettings): void {
  const settingsPath = getSettingsPath()
  try {
    const userDataPath = app.getPath('userData')
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

let mainWindow: BaseWindow | null = null
let leftView: WebContentsView | null = null
let rightView: WebContentsView | null = null
let uiView: WebContentsView | null = null
let settingsWindow: BaseWindow | null = null
let settingsView: WebContentsView | null = null

// 分割バーの幅
const DIVIDER_WIDTH = 6

// 現在の設定を保持
let currentSettings: AppSettings = defaultSettings

// WebContentsViewのレイアウトを更新
function updateViewBounds(): void {
  if (!mainWindow || !leftView || !rightView || !uiView) return

  const bounds = mainWindow.getBounds()
  const width = bounds.width
  const height = bounds.height

  // swappedに応じてURLを入れ替え
  const leftRatio = currentSettings.swapped
    ? 100 - currentSettings.splitRatio
    : currentSettings.splitRatio

  const leftWidth = Math.floor((width * leftRatio) / 100) - DIVIDER_WIDTH / 2
  const rightWidth = width - leftWidth - DIVIDER_WIDTH

  // 左側のビュー
  leftView.setBounds({
    x: 0,
    y: 0,
    width: leftWidth,
    height: height
  })

  // 右側のビュー
  rightView.setBounds({
    x: leftWidth + DIVIDER_WIDTH,
    y: 0,
    width: rightWidth,
    height: height
  })

  // UIオーバーレイ（分割バー領域のみ - クリック透過のため）
  // URLが未設定の場合は、その領域もカバーする
  const leftUrl = currentSettings.swapped ? currentSettings.rightUrl : currentSettings.leftUrl
  const rightUrl = currentSettings.swapped ? currentSettings.leftUrl : currentSettings.rightUrl

  let uiX = leftWidth
  let uiWidth = DIVIDER_WIDTH

  // 左側URLが未設定の場合、左側領域もカバー
  if (!leftUrl) {
    uiX = 0
    uiWidth = leftWidth + DIVIDER_WIDTH
  }

  // 右側URLが未設定の場合、右側領域もカバー
  if (!rightUrl) {
    uiWidth = width - uiX
  }

  uiView.setBounds({
    x: uiX,
    y: 0,
    width: uiWidth,
    height: height
  })
}

// URLを読み込む
function loadUrls(): void {
  if (!leftView || !rightView) return

  const leftUrl = currentSettings.swapped ? currentSettings.rightUrl : currentSettings.leftUrl
  const rightUrl = currentSettings.swapped ? currentSettings.leftUrl : currentSettings.rightUrl

  if (leftUrl) {
    leftView.webContents.loadURL(leftUrl)
  } else {
    leftView.webContents.loadURL('about:blank')
  }

  if (rightUrl) {
    rightView.webContents.loadURL(rightUrl)
  } else {
    rightView.webContents.loadURL('about:blank')
  }
}

function createWindow(): void {
  currentSettings = loadSettings()

  // 永続化セッションを作成
  const leftSession = session.fromPartition('persist:left')
  const rightSession = session.fromPartition('persist:right')

  // BaseWindowを作成
  mainWindow = new BaseWindow({
    width: 1200,
    height: 800,
    show: false,
    ...(process.platform === 'linux' ? { icon } : {})
  })

  // 左側のWebContentsView（永続化セッション使用）
  leftView = new WebContentsView({
    webPreferences: {
      sandbox: true,
      session: leftSession
    }
  })

  // 右側のWebContentsView（永続化セッション使用）
  rightView = new WebContentsView({
    webPreferences: {
      sandbox: true,
      session: rightSession
    }
  })

  // UIオーバーレイ（分割バー用）
  uiView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  // 背景を透明に設定
  uiView.setBackgroundColor('#00000000')

  // ビューを追加（順序が重要：UIが最前面）
  mainWindow.contentView.addChildView(leftView)
  mainWindow.contentView.addChildView(rightView)
  mainWindow.contentView.addChildView(uiView)

  // 外部リンクを既定のブラウザで開く
  leftView.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  rightView.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // UIをロード
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    uiView.webContents.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    uiView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // URLを読み込む
  loadUrls()

  // レイアウトを更新
  updateViewBounds()

  // UIビューの読み込み完了時にウィンドウを表示
  uiView.webContents.once('did-finish-load', () => {
    mainWindow?.show()
  })

  // ウィンドウリサイズ時にレイアウトを更新
  mainWindow.on('resize', () => {
    updateViewBounds()
  })
}

// 設定ウィンドウを表示
function showSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BaseWindow({
    width: 600,
    height: 300,
    parent: mainWindow || undefined,
    modal: false,
    show: false,
    resizable: false
  })

  settingsView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  settingsWindow.contentView.addChildView(settingsView)

  // 設定ウィンドウ全体にビューを配置
  const bounds = settingsWindow.getBounds()
  settingsView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })

  settingsWindow.on('resize', () => {
    if (settingsWindow && settingsView) {
      const b = settingsWindow.getBounds()
      settingsView.setBounds({ x: 0, y: 0, width: b.width, height: b.height })
    }
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
    settingsView = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsView.webContents.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings.html`)
  } else {
    settingsView.webContents.loadFile(join(__dirname, '../renderer/settings.html'))
  }

  settingsView.webContents.once('did-finish-load', () => {
    settingsWindow?.show()
  })
}

// メニューを作成
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        {
          label: '設定',
          accelerator: 'CmdOrCtrl+,',
          click: (): void => {
            showSettingsWindow()
          }
        },
        { type: 'separator' },
        { role: 'quit', label: '終了' }
      ]
    },
    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '元に戻す' },
        { role: 'redo', label: 'やり直し' },
        { type: 'separator' },
        { role: 'cut', label: 'カット' },
        { role: 'copy', label: 'コピー' },
        { role: 'paste', label: 'ペースト' },
        { role: 'selectAll', label: 'すべて選択' }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'toggleDevTools', label: '開発者ツール' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'ズームをリセット' },
        { role: 'zoomIn', label: 'ズームイン' },
        { role: 'zoomOut', label: 'ズームアウト' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'フルスクリーン' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 設定の取得
  ipcMain.handle('get-settings', () => {
    return currentSettings
  })

  // 設定の保存
  ipcMain.handle('save-settings', (_, settings: AppSettings) => {
    const urlChanged =
      settings.leftUrl !== currentSettings.leftUrl ||
      settings.rightUrl !== currentSettings.rightUrl ||
      settings.swapped !== currentSettings.swapped

    currentSettings = settings
    saveSettings(settings)

    // URLが変更された場合は再読み込み
    if (urlChanged) {
      loadUrls()
    }

    // レイアウトを更新
    updateViewBounds()

    // メインウィンドウに設定更新を通知
    uiView?.webContents.send('settings-updated', settings)
    return true
  })

  // splitRatioの更新（ドラッグ中の軽量更新）
  ipcMain.on('update-split-ratio', (_, ratio: number) => {
    currentSettings.splitRatio = ratio
    updateViewBounds()
  })

  // 設定ウィンドウを開く
  ipcMain.on('open-settings', () => {
    showSettingsWindow()
  })

  createMenu()
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
