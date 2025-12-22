import { useEffect, useState } from 'react'
import type { AppSettings } from '../../../preload/index.d'
import './Settings.css'

function Settings(): React.JSX.Element {
  const [leftUrl, setLeftUrl] = useState('')
  const [rightUrl, setRightUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  // 現在の設定を読み込む
  useEffect(() => {
    window.api.getSettings().then((settings) => {
      setLeftUrl(settings.leftUrl)
      setRightUrl(settings.rightUrl)
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
        rightUrl
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

  return (
    <div className="settings-container">
      <h1 className="settings-title">URL設定</h1>

      <div className="form-group">
        <label htmlFor="leftUrl">左側のURL</label>
        <input
          id="leftUrl"
          type="url"
          value={leftUrl}
          onChange={(e) => setLeftUrl(e.target.value)}
          placeholder="https://example.com"
        />
      </div>

      <div className="form-group">
        <label htmlFor="rightUrl">右側のURL</label>
        <input
          id="rightUrl"
          type="url"
          value={rightUrl}
          onChange={(e) => setRightUrl(e.target.value)}
          placeholder="https://example.com"
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
