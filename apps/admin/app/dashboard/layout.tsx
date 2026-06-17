// =============================================================================
// 대시보드 레이아웃 — 사이드바 포함
// =============================================================================
// Server Component. auth() 로 세션을 읽어 사이드바에 사용자 정보를 전달한다.
// =============================================================================

import { auth } from '@/auth'
import { AdminSidebar } from '@/components/admin-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@spotcare/ui/components/sidebar'
import { Separator } from '@spotcare/ui/components/separator'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <SidebarProvider>
      <AdminSidebar
        user={{
          name: session?.user?.name ?? '슈퍼어드민',
          email: session?.user?.email ?? '',
        }}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl p-4 md:p-8">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
