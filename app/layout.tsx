import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistration from '../src/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: '研究室入退室管理システム',
  description: '水野研究室の入退室管理システム',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '入退室管理',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': '入退室管理',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="icon" href="/image/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/image/icon-192x192.png" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}