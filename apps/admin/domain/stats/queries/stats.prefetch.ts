// =============================================================================
// stats 도메인 — Prefetch
// =============================================================================

import type { QueryClient } from '@tanstack/react-query'
import { statsQueryOptions } from './stats.query-options'

export const statsPrefetch = {
  dashboard() {
    return async (queryClient: QueryClient) => {
      await queryClient.prefetchQuery(statsQueryOptions.dashboard())
    }
  },
}
