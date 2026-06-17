'use server'

// =============================================================================
// stats 도메인 — Server Actions (진입점)
// =============================================================================
//
// - requireAdmin() 으로 인증을 강제한다.
// - 조회 액션: 실패 시 throw (React Query 가 error state 처리).
// - Supabase 클라이언트(service_role)는 이 레이어에서만 생성해 service 로 주입한다.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { statsService } from '../service/stats.service'
import type { DashboardStatsDto } from '../types'

export async function getDashboardStatsAction(): Promise<DashboardStatsDto> {
  await requireAdmin()
  const supabase = createClient()
  return statsService.getDashboardStats(supabase)
}
