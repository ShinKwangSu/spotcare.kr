// =============================================================================
// 어드민 목록 페이지
// =============================================================================
// Server Component. searchParams 의 page 로 prefetch 후 HydrationBoundary 전달.
// 현재 로그인 adminId 를 테이블로 전달해 본인 행 삭제 버튼을 비활성화한다.
// =============================================================================

import { HydrationBoundary } from '@tanstack/react-query'

import { auth } from '@/auth'
import { runPrefetch } from '@/lib/react-query/prefetch'
import { adminPrefetch } from '@/domain/admin'
import { AdminsTable } from '@/components/admins-table'
import { CreateAdminDialog } from '@/components/create-admin-dialog'

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const [session, state] = await Promise.all([
    auth(),
    runPrefetch(adminPrefetch.list(page)),
  ])
  const currentAdminId = session?.user?.adminId ?? ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">어드민 관리</h1>
          <p className="text-sm text-muted-foreground">
            슈퍼어드민 계정을 생성하고 관리합니다.
          </p>
        </div>
        <CreateAdminDialog />
      </div>

      <HydrationBoundary state={state}>
        <AdminsTable currentAdminId={currentAdminId} />
      </HydrationBoundary>
    </div>
  )
}
