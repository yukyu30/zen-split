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
  const [uiOffset, setUiOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // 設定を読み込む
  useEffect(() => {
    window.api.getSettings().then(setSettings)

    // 設定更新の通知を受け取る
    const unsubscribe = window.api.onSettingsUpdated(setSettings)
    return unsubscribe
  }, [])

  // UIオフセットを計算（uiViewの開始位置）
  useEffect(() => {
    if (!containerRef.current) return

    const leftUrl = settings.swapped ? settings.rightUrl : settings.leftUrl

    // uiViewが分割バー位置から開始する場合のオフセットを計算
    // メインプロセスと同じロジック
    if (leftUrl) {
      // 左側URLが設定されている場合、uiViewは分割バー位置から開始
      const width = window.innerWidth
      const leftRatio = settings.swapped ? 100 - settings.splitRatio : settings.splitRatio
      const leftWidth = Math.floor((width * leftRatio) / 100) - DIVIDER_WIDTH / 2
      setUiOffset(leftWidth)
    } else {
      setUiOffset(0)
    }
  }, [settings])

  // 分割バーのドラッグ処理
  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // uiOffsetを考慮してウィンドウ全体での位置を計算
      const windowWidth = window.innerWidth
      const x = e.clientX + uiOffset
      const ratio = Math.min(Math.max((x / windowWidth) * 100, 10), 90)

      // ローカル状態を更新
      setSettings((prev) => ({ ...prev, splitRatio: ratio }))

      // メインプロセスにリアルタイム通知（WebContentsViewのリサイズ）
      window.api.updateSplitRatio(ratio)
    },
    [uiOffset]
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

  // URLが未設定かどうか
  const leftUrl = settings.swapped ? settings.rightUrl : settings.leftUrl
  const rightUrl = settings.swapped ? settings.leftUrl : settings.rightUrl
  const showLeftButton = !leftUrl
  const showRightButton = !rightUrl

  // uiView内での分割バー位置を計算
  // uiOffsetが0の場合（左側未設定）: 通常の位置計算
  // uiOffsetがある場合（左側設定済み）: uiView開始位置からのオフセット
  const dividerPosition = uiOffset === 0
    ? `calc(${settings.splitRatio}% - ${DIVIDER_WIDTH / 2}px)`
    : '0px'

  // 設定ボタンコンテナの幅を計算
  const leftButtonWidth = uiOffset === 0
    ? `calc(${settings.splitRatio}% - ${DIVIDER_WIDTH / 2}px)`
    : '0px'

  return (
    <div
      className={isDragging ? 'overlay-container dragging' : 'overlay-container'}
      ref={containerRef}
    >
      {/* 左側の設定ボタン（URLが未設定時のみ、uiOffsetが0の場合のみ表示可能） */}
      {showLeftButton && uiOffset === 0 && (
        <div
          className="setup-button-container"
          style={{ left: 0, width: leftButtonWidth }}
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
          left: dividerPosition,
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
            left: uiOffset === 0
              ? `calc(${settings.splitRatio}% + ${DIVIDER_WIDTH / 2}px)`
              : `${DIVIDER_WIDTH}px`,
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
