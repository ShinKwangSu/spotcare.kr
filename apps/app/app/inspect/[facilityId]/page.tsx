import { getInspectStatus } from '@/app/actions/inspection'
import { floorToDisplay } from '@/lib/utils/floor'
import { InspectEntryButton } from '@/components/inspect-entry-button'
import { ComplaintFormDialog } from '@/components/complaint-form-dialog'

export const dynamic = 'force-dynamic'

export default async function InspectStatusPage({
  params,
}: {
  params: Promise<{ facilityId: string }>
}) {
  const { facilityId } = await params
  const data = await getInspectStatus(facilityId)

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">존재하지 않는 시설입니다.</p>
      </div>
    )
  }

  const {
    facility,
    lastInspection,
    dailyCount,
    weeklyCount,
    monthlyCount,
    checklistItems,
    hasChecklist,
  } = data

  const floorLabel = floorToDisplay(facility.floor)
  const subtitle = [floorLabel, facility.memo]
    .filter(Boolean)
    .join(' · ')

  const lastInspectionLabel = lastInspection
    ? new Date(lastInspection).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '아직 점검 이력 없음'

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg p-6 space-y-6">
        {/* 시설 정보 + 점검하기 */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-bold">{facility.facility_name}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {hasChecklist && <InspectEntryButton facilityId={facilityId} />}
        </div>

        {/* 점검 통계 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '오늘', count: dailyCount },
            { label: '이번 주', count: weeklyCount },
            { label: '이번 달', count: monthlyCount },
          ].map(({ label, count }) => (
            <div key={label} className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold">
                {count}
                <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                  회
                </span>
              </p>
            </div>
          ))}
        </div>

        {/* 마지막 점검 */}
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">마지막 점검</p>
          <p className="text-sm font-medium">{lastInspectionLabel}</p>
        </div>

        {/* 점검 항목 */}
        {checklistItems.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              점검 항목
            </h2>
            <ul className="space-y-2">
              {checklistItems.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  <span>{item.item_name}</span>
                  {item.is_required && (
                    <span className="text-xs text-muted-foreground">(필수)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 민원 접수 */}
        <div className="border-t pt-6">
          <ComplaintFormDialog facilityId={facilityId} />
        </div>

      </div>
    </div>
  )
}
