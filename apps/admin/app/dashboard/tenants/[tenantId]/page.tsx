// =============================================================================
// 테넌트 상세/수정 페이지
// =============================================================================
// Server Component. tenantPrefetch.detail(tenantId) 후 HydrationBoundary 전달.
// =============================================================================

import { HydrationBoundary } from '@tanstack/react-query'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { runPrefetch } from '@/lib/react-query/prefetch'
import { tenantPrefetch } from '@/domain/tenant'
import { TenantDetailView } from '@/components/tenant-detail-view'
import { Button } from '@spotcare/ui/components/button'

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const state = await runPrefetch(tenantPrefetch.detail(tenantId))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/tenants">
            <ChevronLeft className="h-4 w-4" />
            테넌트 목록
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">테넌트 상세</h1>
          <p className="text-sm text-muted-foreground">
            업체 정보 수정 및 워크스페이스 현황을 확인합니다.
          </p>
        </div>
      </div>

      <HydrationBoundary state={state}>
        <TenantDetailView tenantId={tenantId} />
      </HydrationBoundary>
    </div>
  )
}
