import { useEffect, useState, useRef, useCallback } from 'react'
import type { AppSettings } from '../../preload/index.d'
import './App.css'

// 分割バーの幅（メインプロセスと同じ値）
const DIVIDER_WIDTH = 6

function App(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({
    leftUrl: '',
    rightUrl: '',
    splitRatio: 50,
    dividerColor: '#3c3c3c',
    swapped: false
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
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const ratio = Math.min(Math.max((x / rect.width) * 100, 10), 90)

      // ローカル状態を更新
      setSettings((prev) => ({ ...prev, splitRatio: ratio }))

      // メインプロセスにリアルタイム通知（WebContentsViewのリサイズ）
      window.api.updateSplitRatio(ratio)
    },
    []
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    // 最終的なsplitRatioを保存
    window.api.getSettings().then((current) => {
      window.api.saveSettings({ ...current, splitRatio: settings.splitRatio })
    })
  }, [settings.splitRatio])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return (): void => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
    return undefined
  }, [isDragging, handleMouseMove, handleMouseUp])

  // 設定ウィンドウを開く
  const openSettings = useCallback((): void => {
    window.api.openSettings()
  }, [])

  // 分割バーの位置を計算
  const dividerLeft = `calc(${settings.splitRatio}% - ${DIVIDER_WIDTH / 2}px)`

  // URLが未設定かどうか
  const leftUrl = settings.swapped ? settings.rightUrl : settings.leftUrl
  const rightUrl = settings.swapped ? settings.leftUrl : settings.rightUrl
  const showLeftButton = !leftUrl
  const showRightButton = !rightUrl

  return (
    <div
      className={isDragging ? 'overlay-container dragging' : 'overlay-container'}
      ref={containerRef}
    >
      {/* 左側の設定ボタン（URLが未設定時のみ） */}
      {showLeftButton && (
        <div
          className="setup-button-container"
          style={{ left: 0, width: dividerLeft }}
        >
          <button onClick={openSettings} className="setup-button">
            {settings.swapped ? '右側' : '左側'}のURLを設定
          </button>
        </div>
      )}

      {/* 分割バー */}
      <div
        className={isDragging ? 'divider dragging' : 'divider'}
        style={{
          left: dividerLeft,
          width: DIVIDER_WIDTH,
          backgroundColor: settings.dividerColor
        }}
        onMouseDown={handleMouseDown}
      />

      {/* 右側の設定ボタン（URLが未設定時のみ） */}
      {showRightButton && (
        <div
          className="setup-button-container"
          style={{
            left: `calc(${settings.splitRatio}% + ${DIVIDER_WIDTH / 2}px)`,
            right: 0,
            width: 'auto'
          }}
        >
          <button onClick={openSettings} className="setup-button">
            {settings.swapped ? '左側' : '右側'}のURLを設定
          </button>
        </div>
      )}
    </div>
  )
}

export default App
