// =============================================================================
// stats 도메인 — Query Options
// =============================================================================

import { queryOptions } from '@tanstack/react-query'
import { getDashboardStatsAction } from '../actions/stats.actions'
import { statsQueryKeys } from './stats.query-keys'

export const statsQueryOptions = {
  dashboard: () =>
    queryOptions({
      queryKey: statsQueryKeys.dashboard(),
      queryFn: () => getDashboardStatsAction(),
      staleTime: 60_000,
    }),
}
