import Link from 'next/link'
import { BuildingIcon } from 'lucide-react'

import { getWorkspaces } from '@/app/actions/workspace'
import { floorToDisplay, generateFloorOptions } from '@/lib/utils/floor'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@spotcare/ui/components/card'
import { WorkspaceFormDialog } from '@/components/workspace-form-dialog'
import { WorkspaceRowActions } from '@/components/workspace-row-actions'

export default async function WorkspacesPage() {
  const workspaces = await getWorkspaces()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">워크스페이스</h1>
          <p className="text-sm text-muted-foreground">
            관리할 건물/장소를 선택하세요.
          </p>
        </div>
        <WorkspaceFormDialog />
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
          <BuildingIcon className="h-10 w-10 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="font-medium">워크스페이스가 없습니다</p>
            <p className="text-sm text-muted-foreground">
              건물/장소를 등록하면 시설을 관리할 수 있습니다.
            </p>
          </div>
          <WorkspaceFormDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => {
            const floorOptions = generateFloorOptions(ws.max_floor, ws.min_floor)
            const topLabel = ws.max_floor > 0 ? floorToDisplay(ws.max_floor) : null
            const bottomLabel = ws.min_floor < 0 ? floorToDisplay(ws.min_floor) : null
            const floorRange =
              topLabel && bottomLabel
                ? `${bottomLabel} ~ ${topLabel}`
                : topLabel
                  ? `지상 ${topLabel}`
                  : bottomLabel
                    ? `지하 ${bottomLabel}`
                    : '층 정보 없음'

            return (
              <Card
                key={ws.id}
                className="group relative flex flex-col transition-shadow hover:shadow-md cursor-pointer"
              >
                <Link
                  href={`/dashboard/${ws.id}/facilities`}
                  className="absolute inset-0 z-[1] rounded-[inherit]"
                  aria-label={`${ws.workspace_name} 관리`}
                />
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-tight">
                      {ws.workspace_name}
                    </CardTitle>
                    <CardDescription>{floorRange}</CardDescription>
                  </div>
                  <div className="relative z-[2]">
                    <WorkspaceRowActions workspace={ws} />
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors group-hover:bg-muted">
                    <BuildingIcon className="h-4 w-4 shrink-0" />
                    <span>
                      {floorOptions.length > 0
                        ? `총 ${floorOptions.length}개 층`
                        : '층 범위 미설정'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
