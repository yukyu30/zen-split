import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react'
import type { AppSettings } from '../../preload/index.d'
import './App.css'

// WebViewコンポーネントをメモ化
const WebViewPane = memo(function WebViewPane({
  url,
  label,
  partition,
  onOpenSettings
}: {
  url: string
  label: string
  partition: string
  onOpenSettings: () => void
}) {
  if (url) {
    // partition="persist:..."を使用してセッションを永続化
    // これによりクッキー、localStorage、ログイン状態等がディスクに保存される
    return <webview src={url} className="webview" partition={partition} />
  }
  return (
    <div className="placeholder">
      <button onClick={onOpenSettings} className="setup-button">
        {label}のURLを設定
      </button>
    </div>
  )
})

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
  const splitRatioRef = useRef(settings.splitRatio)

  // 設定を読み込む
  useEffect(() => {
    window.api.getSettings().then(setSettings)

    // 設定更新の通知を受け取る
    const unsubscribe = window.api.onSettingsUpdated(setSettings)
    return unsubscribe
  }, [])

  // splitRatioをrefで追跡（保存時に最新値を使用）
  useEffect(() => {
    splitRatioRef.current = settings.splitRatio
  }, [settings.splitRatio])

  // 分割バーのドラッグ処理
  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.min(Math.max((x / rect.width) * 100, 10), 90)

    setSettings((prev) => ({ ...prev, splitRatio: ratio }))
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    // 最新のsplitRatioを使用して保存
    window.api.getSettings().then((current) => {
      window.api.saveSettings({ ...current, splitRatio: splitRatioRef.current })
    })
  }, [])

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

  // swappedに応じてURLを決定（メモ化）
  // partitionはURLに紐づけて永続化（swappedしてもセッションは維持される）
  const { firstUrl, secondUrl, firstLabel, secondLabel, firstPartition, secondPartition } =
    useMemo(
      () => ({
        firstUrl: settings.swapped ? settings.rightUrl : settings.leftUrl,
        secondUrl: settings.swapped ? settings.leftUrl : settings.rightUrl,
        firstLabel: settings.swapped ? '右側' : '左側',
        secondLabel: settings.swapped ? '左側' : '右側',
        // セッションはleft/rightのURLに紐づくので、swapped時はパーティションも入れ替え
        firstPartition: settings.swapped ? 'persist:right' : 'persist:left',
        secondPartition: settings.swapped ? 'persist:left' : 'persist:right'
      }),
      [settings.swapped, settings.leftUrl, settings.rightUrl]
    )

  // スタイルをメモ化
  const firstContainerStyle = useMemo(
    () => ({ width: `${settings.splitRatio}%` }),
    [settings.splitRatio]
  )
  const secondContainerStyle = useMemo(
    () => ({ width: `${100 - settings.splitRatio}%` }),
    [settings.splitRatio]
  )
  const dividerStyle = useMemo(
    () => ({ backgroundColor: settings.dividerColor }),
    [settings.dividerColor]
  )

  const containerClass = isDragging ? 'app-container dragging' : 'app-container'
  const paneClass = isDragging ? 'webview-container dragging' : 'webview-container'
  const dividerClass = isDragging ? 'divider dragging' : 'divider'

  return (
    <div className={containerClass} ref={containerRef}>
      <div className={paneClass} style={firstContainerStyle}>
        <WebViewPane
          url={firstUrl}
          label={firstLabel}
          partition={firstPartition}
          onOpenSettings={openSettings}
        />
      </div>

      <div className={dividerClass} style={dividerStyle} onMouseDown={handleMouseDown} />

      <div className={paneClass} style={secondContainerStyle}>
        <WebViewPane
          url={secondUrl}
          label={secondLabel}
          partition={secondPartition}
          onOpenSettings={openSettings}
        />
      </div>
    </div>
  )
}

export default App
