import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from '@spotcare/ui/components/sonner'

const pretendard = localFont({
  src: '../../../packages/ui/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '45 920',
})

export const metadata: Metadata = {
  title: 'spotcare.kr — 시설 관리 어드민',
  description: '멀티테넌트 시설 관리 어드민 MVP',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning className={pretendard.variable}>
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
