import { getInspectors } from '@/app/actions/inspector'
import { InspectorManager } from '@/components/inspector-manager'

export default async function InspectorsPage() {
  const inspectors = await getInspectors()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">점검자 관리</h1>
        <p className="text-sm text-muted-foreground">
          점검을 수행하는 담당자를 관리하세요.
        </p>
      </div>

      <InspectorManager inspectors={inspectors} />
    </div>
  )
}
