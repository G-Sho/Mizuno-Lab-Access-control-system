'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Check if service worker is registered by next-pwa
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log('Service Worker registrations:', registrations.length)
        registrations.forEach((registration, index) => {
          console.log(`SW ${index + 1}:`, registration.scope, registration.active?.state)
        })
      })

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed')
      })
    }
  }, [])

  return null
}