import { useEffect, useState, useRef, useCallback } from 'react'
import type { AppSettings } from '../../preload/index.d'
import './App.css'

function App(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({
    leftUrl: '',
    rightUrl: '',
    splitRatio: 50
  })
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 設定を読み込む
  useEffect(() => {
    window.api.getSettings().then(setSettings)

    // 設定更新の通知を受け取る
    const unsubscribe = window.api.onSettingsUpdated(setSettings)
    return unsubscribe
  }, [])

  // 分割バーのドラッグ処理
  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const ratio = Math.min(Math.max((x / rect.width) * 100, 10), 90)

      setSettings((prev) => ({ ...prev, splitRatio: ratio }))
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      // 分割割合を保存
      window.api.saveSettings(settings)
    }
  }, [isDragging, settings])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return (): void => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
    return undefined
  }, [isDragging, handleMouseMove, handleMouseUp])

  // 設定ウィンドウを開く
  const openSettings = (): void => {
    window.api.openSettings()
  }

  return (
    <div className={`app-container ${isDragging ? 'dragging' : ''}`} ref={containerRef}>
      {/* 左側のWebView */}
      <div
        className={`webview-container ${isDragging ? 'dragging' : ''}`}
        style={{ width: `${settings.splitRatio}%` }}
      >
        {settings.leftUrl ? (
          <webview src={settings.leftUrl} className="webview" />
        ) : (
          <div className="placeholder">
            <button onClick={openSettings} className="setup-button">
              左側のURLを設定
            </button>
          </div>
        )}
      </div>

      {/* 分割バー */}
      <div
        className={`divider ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      />

      {/* 右側のWebView */}
      <div
        className={`webview-container ${isDragging ? 'dragging' : ''}`}
        style={{ width: `${100 - settings.splitRatio}%` }}
      >
        {settings.rightUrl ? (
          <webview src={settings.rightUrl} className="webview" />
        ) : (
          <div className="placeholder">
            <button onClick={openSettings} className="setup-button">
              右側のURLを設定
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
