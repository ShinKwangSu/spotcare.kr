// =============================================================================
// stats 도메인 — service (비즈니스 로직)
// =============================================================================

import type { TypedSupabaseClient } from '@spotcare/database'
import { statsRepository } from '../repository/stats.repository'
import type { DashboardStatsDto } from '../types'

type Db = TypedSupabaseClient

export const statsService = {
  /** 대시보드 운영 통계 — 카운트를 병렬 집계한다. */
  async getDashboardStats(supabase: Db): Promise<DashboardStatsDto> {
    const [adminCount, tenantCount, facilityCount, workspaceCount] =
      await Promise.all([
        statsRepository.count(supabase, 'admins'),
        statsRepository.count(supabase, 'tenants'),
        statsRepository.count(supabase, 'facilities'),
        statsRepository.count(supabase, 'workspaces'),
      ])

    return { adminCount, tenantCount, facilityCount, workspaceCount }
  },
}
