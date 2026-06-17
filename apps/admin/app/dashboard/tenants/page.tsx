// =============================================================================
// 테넌트 목록 페이지
// =============================================================================
// Server Component. searchParams 의 page/search 로 prefetch 후 전달.
// =============================================================================

import { HydrationBoundary } from '@tanstack/react-query'

import { runPrefetch } from '@/lib/react-query/prefetch'
import { tenantPrefetch } from '@/domain/tenant'
import { TenantsTable } from '@/components/tenants-table'

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const { page: pageParam, search } = await searchParams
  const page = Number(pageParam) || 1

  const state = await runPrefetch(tenantPrefetch.list(page, search || undefined))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">테넌트 관리</h1>
        <p className="text-sm text-muted-foreground">
          가입한 시설 관리 업체(테넌트)를 조회하고 관리합니다.
        </p>
      </div>

      <HydrationBoundary state={state}>
        <TenantsTable />
      </HydrationBoundary>
    </div>
  )
}
