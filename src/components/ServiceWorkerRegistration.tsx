'use client'

import { useEffect } from 'react'
import { Workbox } from 'workbox-window'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const wb = new Workbox('/sw.js')

      const showSkipWaitingPrompt = () => {
        // Service Worker の更新があった場合の処理
        // 今回はシンプルに自動で更新
        wb.addEventListener('waiting', () => {
          wb.messageSkipWaiting()
        })
      }

      wb.addEventListener('controlling', () => {
        // 新しい Service Worker が制御を開始した時にリロード
        window.location.reload()
      })

      wb.register()
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration)
          showSkipWaitingPrompt()
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, [])

  return null
}