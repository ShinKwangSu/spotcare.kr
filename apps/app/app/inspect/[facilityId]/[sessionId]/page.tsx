// =============================================================================
// /inspect/[facilityId]/[sessionId] — 점검표 폼 페이지
// =============================================================================

import { getInspectionSession } from '@/app/actions/inspection'
import { floorToDisplay } from '@/lib/utils/floor'
import { InspectionForm } from '@/components/inspection-form'

export default async function InspectSessionPage({
  params,
}: {
  params: Promise<{ facilityId: string; sessionId: string }>
}) {
  const { facilityId, sessionId } = await params
  const result = await getInspectionSession(facilityId, sessionId)

  if (!result.valid) {
    const message =
      result.reason === 'completed'
        ? '이미 제출된 점검입니다.'
        : '세션이 만료됐습니다. QR을 다시 찍어주세요.'

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-xl font-semibold text-destructive">{message}</p>
          <p className="text-sm text-muted-foreground">
            QR 코드를 재스캔 해주세요.
          </p>
        </div>
      </div>
    )
  }

  const { facility, checklistItems } = result.data
  const floorLabel = floorToDisplay(facility.floor)
  const subtitle = [floorLabel, facility.memo].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{facility.facility_name}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <InspectionForm
          sessionId={sessionId}
          facilityId={facilityId}
          checklistItems={checklistItems}
        />
      </div>
    </div>
  )
}
