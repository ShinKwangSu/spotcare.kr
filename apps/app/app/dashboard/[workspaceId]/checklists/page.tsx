import { notFound } from 'next/navigation'

import { getWorkspace } from '@/app/actions/workspace'
import { getChecklists } from '@/app/actions/checklist'
import { ChecklistManager } from '@/components/checklist-manager'

export default async function ChecklistsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params

  const workspaceResult = await getWorkspace(workspaceId)
  if (!workspaceResult.success || !workspaceResult.data) notFound()
  const workspace = workspaceResult.data

  const checklists = await getChecklists(workspaceId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">점검표 관리</h1>
        <p className="text-sm text-muted-foreground">
          {workspace.workspace_name} · 점검 주기와 항목을 관리하세요.
        </p>
      </div>

      <ChecklistManager workspaceId={workspaceId} checklists={checklists} />
    </div>
  )
}
