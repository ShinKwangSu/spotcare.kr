'use client'

// =============================================================================
// 시설별 점검이력 Sheet — 이력 목록 + 상세 읽기전용 뷰 (수정 불가)
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, ArrowLeft, CheckCircle2, XCircle, MinusCircle, User, Phone } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@spotcare/ui/components/sheet'
import { Button } from '@spotcare/ui/components/button'
import { Badge } from '@spotcare/ui/components/badge'
import { Skeleton } from '@spotcare/ui/components/skeleton'
import { Separator } from '@spotcare/ui/components/separator'
import {
  getInspectionHistory,
  getInspectionDetail,
  type InspectionHistoryItem,
  type InspectionHistoryDetail,
} from '@/app/actions/inspection'
import { formatPhone, rawPhone } from '@/lib/utils/phone'
import type { FacilityWithChecklists } from '@/types/database'

// -----------------------------------------------------------------------------
// 날짜 포맷 유틸
// -----------------------------------------------------------------------------

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// -----------------------------------------------------------------------------
// 이력 목록 뷰
// -----------------------------------------------------------------------------

function HistoryList({
  facilityId,
  facilityName,
  onSelect,
}: {
  facilityId: string
  facilityName: string
  onSelect: (item: InspectionHistoryItem) => void
}) {
  const [items, setItems] = useState<InspectionHistoryItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getInspectionHistory(facilityId).then((data) => {
      setItems(data)
      setLoading(false)
    })
  }, [facilityId])

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <ClipboardList className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm">아직 점검 이력이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 pt-4">
      <p className="text-xs text-muted-foreground">
        총 {items.length}건
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.session_id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">
                  {formatDateTime(item.submitted_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.inspector_name ?? '점검자 미상'}
                  {item.inspector_phone && (
                    <a
                      href={`tel:${rawPhone(item.inspector_phone)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 opacity-60 hover:opacity-100 hover:underline"
                    >
                      ({formatPhone(item.inspector_phone)})
                    </a>
                  )}
                </p>
              </div>
              {item.total_count > 0 && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    {item.pass_count}
                  </Badge>
                  {item.fail_count > 0 && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <XCircle className="h-3 w-3" />
                      {item.fail_count}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 이력 상세 뷰 (읽기 전용)
// -----------------------------------------------------------------------------

function HistoryDetail({
  sessionId,
  facilityId,
  onBack,
}: {
  sessionId: string
  facilityId: string
  onBack: () => void
}) {
  const [detail, setDetail] = useState<InspectionHistoryDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getInspectionDetail(sessionId, facilityId).then((data) => {
      setDetail(data)
      setLoading(false)
    })
  }, [sessionId, facilityId])

  return (
    <div className="space-y-4 pt-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        이력 목록으로
      </Button>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : !detail ? (
        <p className="text-sm text-muted-foreground">점검 정보를 불러올 수 없습니다.</p>
      ) : (
        <>
          {/* 점검자 정보 */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              점검 정보
            </p>
            <p className="text-sm font-medium">{formatDateTime(detail.submitted_at)}</p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {detail.inspector_name ?? '점검자 미상'}
              </span>
              {detail.inspector_phone && (
                <a
                  href={`tel:${rawPhone(detail.inspector_phone)}`}
                  className="flex items-center gap-1.5 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhone(detail.inspector_phone)}
                </a>
              )}
            </div>
          </div>

          <Separator />

          {/* 점검 항목 결과 */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              점검 항목
            </p>
            {detail.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">점검 항목 정보가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {detail.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-4 py-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm">{item.item_name}</span>
                      {item.is_required && (
                        <span className="shrink-0 text-xs text-muted-foreground">(필수)</span>
                      )}
                    </div>
                    <div className="shrink-0">
                      {item.passed === true ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : item.passed === false ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <MinusCircle className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// 메인 컴포넌트 — Sheet 트리거 + 목록/상세 전환
// -----------------------------------------------------------------------------

export function FacilityInspectionHistory({
  facility,
}: {
  facility: FacilityWithChecklists
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<InspectionHistoryItem | null>(null)

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) setSelected(null)
  }, [])

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <ClipboardList className="h-4 w-4" />
          점검이력
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">
            {selected ? '점검 상세' : `점검이력 — ${facility.facility_name}`}
          </SheetTitle>
        </SheetHeader>

        {selected ? (
          <HistoryDetail
            sessionId={selected.session_id}
            facilityId={facility.id}
            onBack={() => setSelected(null)}
          />
        ) : (
          <HistoryList
            facilityId={facility.id}
            facilityName={facility.facility_name}
            onSelect={setSelected}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
