import { useEffect, useState } from 'react'
import type { AppSettings } from '../../../preload/index.d'
import './Settings.css'

function Settings(): React.JSX.Element {
  const [leftUrl, setLeftUrl] = useState('')
  const [rightUrl, setRightUrl] = useState('')
  const [dividerColor, setDividerColor] = useState('#3c3c3c')
  const [swapped, setSwapped] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  // 現在の設定を読み込む
  useEffect(() => {
    window.api.getSettings().then((settings) => {
      setLeftUrl(settings.leftUrl)
      setRightUrl(settings.rightUrl)
      setDividerColor(settings.dividerColor || '#3c3c3c')
      setSwapped(settings.swapped || false)
    })
  }, [])

  // 設定を保存
  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    setMessage('')

    try {
      const currentSettings = await window.api.getSettings()
      const newSettings: AppSettings = {
        ...currentSettings,
        leftUrl,
        rightUrl,
        dividerColor,
        swapped
      }
      await window.api.saveSettings(newSettings)
      setMessage('設定を保存しました')
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      setMessage('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 左右入れ替え
  const handleSwap = async (): Promise<void> => {
    // 入力欄の値を入れ替え
    const tempLeft = leftUrl
    setLeftUrl(rightUrl)
    setRightUrl(tempLeft)

    try {
      const currentSettings = await window.api.getSettings()
      await window.api.saveSettings({
        ...currentSettings,
        leftUrl: rightUrl,
        rightUrl: tempLeft
      })
    } catch (error) {
      console.error('Failed to swap:', error)
    }
  }

  return (
    <div className="settings-container">
      <h1 className="settings-title">設定</h1>

      <div className="url-row">
        <div className="form-group url-group">
          <label htmlFor="leftUrl">左側のURL</label>
          <input
            id="leftUrl"
            type="url"
            value={leftUrl}
            onChange={(e) => setLeftUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <button onClick={handleSwap} className="swap-button" title="左右を入れ替え">
          ⇄
        </button>

        <div className="form-group url-group">
          <label htmlFor="rightUrl">右側のURL</label>
          <input
            id="rightUrl"
            type="url"
            value={rightUrl}
            onChange={(e) => setRightUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="color-row">
        <label>分割バーの色</label>
        <input
          type="color"
          value={dividerColor}
          onChange={(e) => setDividerColor(e.target.value)}
          className="color-input"
        />
      </div>

      <button onClick={handleSave} disabled={isSaving} className="save-button">
        {isSaving ? '保存中...' : '保存'}
      </button>

      {message && <p className="message">{message}</p>}
    </div>
  )
}

export default Settings
