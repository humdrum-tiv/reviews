'use client'

/**
 * Request notification permission and register the service worker.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return reg
  } catch {
    return null
  }
}

/**
 * Schedule a local notification using the service worker.
 * time is "HH:MM" in 24h format.
 */
export async function scheduleNotification(title: string, body: string, time: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  if (!reg) return

  const [hours, minutes] = time.split(':').map(Number)
  const now = new Date()
  const scheduled = new Date()
  scheduled.setHours(hours, minutes, 0, 0)

  // If time already passed today, schedule for tomorrow
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1)
  }

  const delay = scheduled.getTime() - now.getTime()

  setTimeout(() => {
    reg.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: title.toLowerCase().replace(/\s+/g, '-'),
    })
  }, delay)
}

export async function setupDailyNotifications(morningTime: string, eveningTime: string): Promise<void> {
  await scheduleNotification('Morning Review', "Time for your morning review. Start the day with intention.", morningTime)
  await scheduleNotification('Evening Review', "Time for your evening review. Reflect on the day.", eveningTime)
}
