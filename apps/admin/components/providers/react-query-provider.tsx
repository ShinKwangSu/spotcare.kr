'use client'

// =============================================================================
// React Query Provider — apps/admin
// =============================================================================
// Client Component. 앱 전역에 단일 QueryClient 를 제공한다.
// QueryClient 는 useState 로 한 번만 생성해 리렌더 시 재생성을 방지한다.
// =============================================================================

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
