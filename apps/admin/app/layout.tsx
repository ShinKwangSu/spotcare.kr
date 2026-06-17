import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import './globals.css'

import { ReactQueryProvider } from '@/components/providers/react-query-provider'
import { Toaster } from '@spotcare/ui/components/sonner'

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
      <body>
        <NuqsAdapter>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </NuqsAdapter>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
