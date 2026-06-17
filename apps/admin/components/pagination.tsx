'use client'

// =============================================================================
// Pagination — 이전/다음 + 현재 페이지 표시
// =============================================================================
// @spotcare/ui 에 전용 페이지네이션 컴포넌트가 없으므로 Button 으로 구성한다.
// 상태(page)는 상위(nuqs 등)에서 관리하고 onPageChange 콜백으로 위임받는다.
// =============================================================================

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@spotcare/ui/components/button'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const safeTotal = Math.max(totalPages, 1)
  const canPrev = page > 1
  const canNext = page < safeTotal

  return (
    <div className="flex items-center justify-end gap-4 pt-4">
      <span className="text-sm text-muted-foreground">
        {page} / {safeTotal} 페이지
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          이전
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          다음
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
