'use client'

import { useEffect } from 'react'

export default function PWARegistration() {
  useEffect(() => {
    // Register service worker manually using next-pwa approach
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const register = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          })
          console.log('Service Worker registered successfully:', registration.scope)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            console.log('Service Worker update found')
          })
        } catch (error) {
          console.error('Service Worker registration failed:', error)
        }
      }

      register()
    }
  }, [])

  return null
}