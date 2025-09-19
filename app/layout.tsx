import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '研究室入退室管理システム',
  description: '水野研究室の入退室管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}