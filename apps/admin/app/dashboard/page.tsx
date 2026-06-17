// =============================================================================
// 대시보드 홈 — 운영 통계
// =============================================================================
// Server Component. stats prefetch 후 HydrationBoundary 로 Client 에 전달한다.
// =============================================================================

import { HydrationBoundary } from '@tanstack/react-query'

import { runPrefetch } from '@/lib/react-query/prefetch'
import { statsPrefetch } from '@/domain/stats'
import { DashboardStatsCards } from '@/components/dashboard-stats-cards'

export default async function DashboardPage() {
  const state = await runPrefetch(statsPrefetch.dashboard())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground">
          spotcare 서비스 운영 현황을 한눈에 확인합니다.
        </p>
      </div>

      <HydrationBoundary state={state}>
        <DashboardStatsCards />
      </HydrationBoundary>
    </div>
  )
}
