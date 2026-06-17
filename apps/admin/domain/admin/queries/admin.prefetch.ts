// =============================================================================
// admin 도메인 — Prefetch
// =============================================================================
// Server Component 에서 runPrefetch 와 조합해 사용한다.
// =============================================================================

import type { QueryClient } from '@tanstack/react-query'
import { adminQueryOptions } from './admin.query-options'

export const adminPrefetch = {
  list(page = 1) {
    return async (queryClient: QueryClient) => {
      await queryClient.prefetchQuery(adminQueryOptions.list(page))
    }
  },
  detail(adminId: string) {
    return async (queryClient: QueryClient) => {
      await queryClient.prefetchQuery(adminQueryOptions.detail(adminId))
    }
  },
}
