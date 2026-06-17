// =============================================================================
// tenant 도메인 — Prefetch
// =============================================================================
// Server Component 에서 runPrefetch 와 조합해 사용한다.
// =============================================================================

import type { QueryClient } from '@tanstack/react-query'
import { tenantQueryOptions } from './tenant.query-options'

export const tenantPrefetch = {
  list(page = 1, search?: string) {
    return async (queryClient: QueryClient) => {
      await queryClient.prefetchQuery(tenantQueryOptions.list(page, search))
    }
  },
  detail(tenantId: string) {
    return async (queryClient: QueryClient) => {
      await queryClient.prefetchQuery(tenantQueryOptions.detail(tenantId))
    }
  },
}
