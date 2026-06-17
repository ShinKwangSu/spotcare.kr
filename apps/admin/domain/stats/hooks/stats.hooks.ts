'use client'

// =============================================================================
// stats 도메인 — Client Hooks
// =============================================================================

import { useQuery } from '@tanstack/react-query'
import { statsQueryOptions } from '../queries'

/** 대시보드 운영 통계 조회 */
export function useDashboardStats() {
  return useQuery(statsQueryOptions.dashboard())
}
