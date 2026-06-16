import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const pretendard = localFont({
  src: '../../../packages/ui/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '45 920',
})

export const metadata: Metadata = {
  title: 'spotcare Admin',
  description: 'spotcare.kr 서비스 관리자 포털',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>{children}</body>
    </html>
  )
}
