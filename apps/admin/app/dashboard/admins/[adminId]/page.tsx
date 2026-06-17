// =============================================================================
// 어드민 상세/수정 페이지
// =============================================================================
// Server Component. adminPrefetch.detail(adminId) 후 HydrationBoundary 전달.
// =============================================================================

import { HydrationBoundary } from '@tanstack/react-query'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { runPrefetch } from '@/lib/react-query/prefetch'
import { adminPrefetch } from '@/domain/admin'
import { AdminEditForm } from '@/components/admin-edit-form'
import { Button } from '@spotcare/ui/components/button'

export default async function AdminDetailPage({
  params,
}: {
  params: Promise<{ adminId: string }>
}) {
  const { adminId } = await params
  const state = await runPrefetch(adminPrefetch.detail(adminId))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/admins">
            <ChevronLeft className="h-4 w-4" />
            어드민 목록
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">어드민 수정</h1>
          <p className="text-sm text-muted-foreground">
            어드민 계정의 이름과 이메일을 수정합니다.
          </p>
        </div>
      </div>

      <HydrationBoundary state={state}>
        <AdminEditForm adminId={adminId} />
      </HydrationBoundary>
    </div>
  )
}
