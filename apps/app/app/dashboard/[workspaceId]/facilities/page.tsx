// =============================================================================
// spotcare.kr MVP — 시설 정보 관리 페이지
// =============================================================================
// 서버 컴포넌트: 워크스페이스(층수 범위) + 타입 목록 + 시설 목록을 조회해
// 클라이언트 매니저(FacilityManager)로 Table + 등록/수정/삭제 Form 렌더.
// 층수 Select 는 workspace.max_floor/min_floor 로 옵션을 만든다.
// =============================================================================

import { notFound } from 'next/navigation'

import { getWorkspace } from '@/app/actions/workspace'
import { getFacilityTypes } from '@/app/actions/facility-type'
import { getFacilities } from '@/app/actions/facility'
import { getChecklists } from '@/app/actions/checklist'
import { FacilityManager } from '@/components/facility-manager'

export default async function FacilitiesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params

  const workspaceResult = await getWorkspace(workspaceId)
  if (!workspaceResult.success || !workspaceResult.data) notFound()
  const workspace = workspaceResult.data

  const [facilityTypes, facilities, checklists] = await Promise.all([
    getFacilityTypes(workspaceId),
    getFacilities(workspaceId),
    getChecklists(workspaceId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">시설 정보 관리</h1>
        <p className="text-sm text-muted-foreground">
          {workspace.workspace_name} · 시설을 등록하고 층/타입으로
          관리하세요.
        </p>
      </div>

      <FacilityManager
        workspace={workspace}
        facilityTypes={facilityTypes}
        facilities={facilities}
        checklists={checklists}
      />
    </div>
  )
}
