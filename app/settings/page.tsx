'use client'

import { useEffect, useState } from 'react'
import { useReviewStore } from '@/store/reviewStore'
import { pickObsidianFolder } from '@/lib/export'
import { saveObsidianHandle } from '@/lib/storage'
import { requestNotificationPermission, registerServiceWorker, setupDailyNotifications, notificationsSupported } from '@/lib/notifications'
import { useTheme, type Theme, type Mode } from '@/components/ThemeProvider'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type ThemeOption = { id: Theme; label: string; variant: 'light' | 'dark' }

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'stone',    label: 'Stone — Light', variant: 'light' },
  { id: 'stone',    label: 'Stone — Dark',  variant: 'dark'  },
  { id: 'terminal', label: 'Terminal — Light', variant: 'light' },
  { id: 'terminal', label: 'Terminal — Dark',  variant: 'dark'  },
]

function ThemePreview({ themeId, variant }: { themeId: Theme; variant: 'light' | 'dark' }) {
  const key = `${themeId}-${variant}` as const
  return (
    <div className={`theme-preview theme-preview--${key}`}>
      <div className={`theme-preview-bar theme-preview-bar--${key}`}>
        <div className={`theme-preview-dot theme-preview-dot--${key}`} />
        <div className={`theme-preview-dot theme-preview-dot--${key}`} style={{ opacity: 0.4 }} />
        <div className={`theme-preview-dot theme-preview-dot--${key}`} style={{ opacity: 0.4 }} />
      </div>
      <div className="theme-preview-lines">
        <div className={`theme-preview-line theme-preview-line--${key} short`} />
        <div className={`theme-preview-line theme-preview-line--${key}`} />
        <div className={`theme-preview-line theme-preview-line--${key}`} style={{ width: '75%' }} />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { loadAll, isLoaded, settings, updateSetting, setObsidianFolder } = useReviewStore()
  const { theme, resolvedMode, setTheme, mode, setMode } = useTheme()
  const [notifStatus, setNotifStatus] = useState('')
  const [obsidianStatus, setObsidianStatus] = useState('')

  useEffect(() => {
    if (!isLoaded) loadAll()
  }, [isLoaded, loadAll])

  // Auto-reschedule notifications when times change
  useEffect(() => {
    if (!isLoaded || !settings.notificationsEnabled) return
    setupDailyNotifications(settings.morningTime, settings.eveningTime)
  }, [isLoaded, settings.notificationsEnabled, settings.morningTime, settings.eveningTime])

  const handleNotifications = async () => {
    setNotifStatus('Requesting…')
    await registerServiceWorker()
    const granted = await requestNotificationPermission()
    if (granted) {
      await updateSetting('notificationsEnabled', true)
      await setupDailyNotifications(settings.morningTime, settings.eveningTime)
      setNotifStatus('Notifications enabled!')
    } else {
      setNotifStatus('Permission denied.')
    }
  }

  const handlePickFolder = async () => {
    setObsidianStatus('Picking folder…')
    const result = await pickObsidianFolder()
    if (result) {
      await saveObsidianHandle(result.handle)
      await setObsidianFolder(result.handle, result.path)
      setObsidianStatus(`Connected: ${result.path}`)
    } else {
      setObsidianStatus('No folder selected.')
    }
  }

  if (!isLoaded) return <div className="loading-state"><p>Loading…</p></div>

  return (
    <div className="settings-layout">
      <h1 className="page-title">Settings</h1>

      {/* Appearance */}
      <section className="settings-section">
        <h2 className="settings-section-title">Appearance</h2>
        <p className="settings-description">
          Choose a theme and color mode. Stone uses a layered grey-slab design with serif type.
          Terminal uses monospace fonts, flat borders, and a phosphor-screen palette.
        </p>

        <div className="theme-options">
          {THEME_OPTIONS.map((opt) => {
            const isActive = theme === opt.id && resolvedMode === opt.variant
            return (
              <button
                key={opt.label}
                className={`theme-option ${isActive ? 'theme-option--active' : ''}`}
                onClick={() => {
                  setTheme(opt.id)
                  setMode(opt.variant as Mode)
                }}
                title={opt.label}
              >
                <ThemePreview themeId={opt.id} variant={opt.variant} />
                <span className="theme-option-label">{opt.label}</span>
              </button>
            )
          })}
        </div>

        <p className="settings-description" style={{ marginBottom: 10 }}>
          Or choose a mode separately and let the theme follow your system setting:
        </p>
        <div className="mode-options">
          {(['light', 'dark', 'system'] as Mode[]).map((m) => (
            <button
              key={m}
              className={`mode-btn ${mode === m ? 'mode-btn--active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'light' ? 'Light' : m === 'dark' ? 'Dark' : 'System'}
            </button>
          ))}
        </div>
      </section>

      {/* Rest Day */}
      <section className="settings-section">
        <h2 className="settings-section-title">Rest Day</h2>
        <p className="settings-description">
          Choose a day each week with no reviews. Major reviews that land on this day shift to the next available day.
        </p>
        <div className="day-picker">
          <button
            className={`day-btn ${settings.restDay === null ? 'day-btn--active' : ''}`}
            onClick={() => updateSetting('restDay', null)}
          >
            None
          </button>
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              className={`day-btn ${settings.restDay === i ? 'day-btn--active' : ''}`}
              onClick={() => {
                if (i === settings.weeklyReviewDay) return // prevent conflict
                updateSetting('restDay', i)
              }}
              disabled={i === settings.weeklyReviewDay}
              title={i === settings.weeklyReviewDay ? 'Cannot rest on your weekly review day' : undefined}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>
      </section>

      {/* Weekly Review Day */}
      <section className="settings-section">
        <h2 className="settings-section-title">Weekly Review Day</h2>
        <p className="settings-description">
          Which day of the week should your weekly review happen?
        </p>
        <div className="day-picker">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              className={`day-btn ${settings.weeklyReviewDay === i ? 'day-btn--active' : ''}`}
              onClick={() => {
                if (i === settings.restDay) return // prevent conflict
                updateSetting('weeklyReviewDay', i)
              }}
              disabled={i === settings.restDay}
              title={i === settings.restDay ? 'Cannot review on your rest day' : undefined}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>
      </section>

      {/* Notification Times */}
      <section className="settings-section">
        <h2 className="settings-section-title">Review Reminders</h2>
        <p className="settings-description">
          Set the times for morning and evening review reminders.
        </p>
        <div className="time-pickers">
          <label className="time-label">
            <span>Morning</span>
            <input
              type="time"
              value={settings.morningTime}
              onChange={(e) => updateSetting('morningTime', e.target.value)}
              className="time-input"
            />
          </label>
          <label className="time-label">
            <span>Evening</span>
            <input
              type="time"
              value={settings.eveningTime}
              onChange={(e) => updateSetting('eveningTime', e.target.value)}
              className="time-input"
            />
          </label>
        </div>
        {notificationsSupported() && (
          <div className="settings-action">
            <button onClick={handleNotifications} className="settings-btn">
              {settings.notificationsEnabled ? 'Notifications on — update times' : 'Enable notifications'}
            </button>
            {notifStatus && <p className="settings-status">{notifStatus}</p>}
          </div>
        )}
      </section>

      {/* Obsidian Export */}
      <section className="settings-section">
        <h2 className="settings-section-title">Obsidian Vault</h2>
        <p className="settings-description">
          Connect a folder to automatically save completed reviews as markdown files. Files are saved to{' '}
          <code>Reviews/{'{type}'}/{'{year}'}/{'{date}'}-{'{type}'}-review.md</code>
        </p>
        <div className="settings-action">
          {settings.obsidianFolderPath && (
            <p className="settings-connected">
              Connected: <strong>{settings.obsidianFolderPath}</strong>
            </p>
          )}
          <button onClick={handlePickFolder} className="settings-btn">
            {settings.obsidianFolderPath ? 'Change folder' : 'Connect Obsidian vault'}
          </button>
          {obsidianStatus && <p className="settings-status">{obsidianStatus}</p>}
        </div>
        <p className="settings-note">
          Uses the File System Access API. Only works in Chrome/Edge. Safari and Firefox will need to use the manual .md export button.
        </p>
      </section>
    </div>
  )
}
