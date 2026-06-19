'use client'

// =============================================================================
// spotcare.kr MVP — 점검표 입력 폼 (클라이언트 컴포넌트)
// checklist 항목: 체크박스 / photo 항목: 카메라 촬영 또는 파일 선택
// =============================================================================

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'
import { submitInspection, uploadInspectionPhoto } from '@/app/actions/inspection'
import type { ChecklistItem } from '@/types/database'
import { Button } from '@spotcare/ui/components/button'

type Props = {
  sessionId: string
  facilityId: string
  checklistItems: ChecklistItem[]
}

// item_results 값: checklist → boolean, photo → URL string
type Results = Record<string, boolean | string>

export function InspectionForm({ sessionId, facilityId, checklistItems }: Props) {
  const [results, setResults] = useState<Results>(
    Object.fromEntries(
      checklistItems.map((item) => [
        item.id,
        item.response_type === 'checklist' ? false : '',
      ])
    )
  )
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // 필수 항목이 모두 충족됐는지 확인
  const allRequiredSatisfied = checklistItems
    .filter((item) => item.is_required)
    .every((item) => {
      const val = results[item.id]
      return item.response_type === 'checklist' ? val === true : typeof val === 'string' && val.length > 0
    })

  function toggleCheck(id: string) {
    setResults((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handlePhotoChange(item: ChecklistItem, file: File) {
    setUploading((prev) => ({ ...prev, [item.id]: true }))
    const formData = new FormData()
    formData.set('file', file)
    const result = await uploadInspectionPhoto(sessionId, facilityId, item.id, formData)
    if (result.success) {
      setResults((prev) => ({ ...prev, [item.id]: result.url }))
    } else {
      toast.error(result.error)
    }
    setUploading((prev) => ({ ...prev, [item.id]: false }))
  }

  function clearPhoto(id: string) {
    setResults((prev) => ({ ...prev, [id]: '' }))
  }

  function handleSubmit() {
    if (!allRequiredSatisfied) {
      toast.error('필수 항목을 모두 완료해주세요.')
      return
    }
    startTransition(async () => {
      const result = await submitInspection(sessionId, facilityId, results)
      if (result.success) {
        router.push(`/inspect/${facilityId}/${sessionId}/success`)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (checklistItems.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        등록된 점검 항목이 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {checklistItems.map((item) =>
          item.response_type === 'photo' ? (
            <PhotoItem
              key={item.id}
              item={item}
              value={results[item.id] as string}
              uploading={!!uploading[item.id]}
              onChange={(file) => handlePhotoChange(item, file)}
              onClear={() => clearPhoto(item.id)}
            />
          ) : (
            <CheckItem
              key={item.id}
              item={item}
              checked={results[item.id] as boolean}
              onToggle={() => toggleCheck(item.id)}
            />
          )
        )}
      </div>

      {checklistItems.some((i) => i.is_required) && (
        <p className="text-xs text-muted-foreground">* 표시된 항목은 필수입니다.</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isPending || !allRequiredSatisfied || Object.values(uploading).some(Boolean)}
        className="w-full"
        size="lg"
      >
        {isPending ? '제출 중...' : '점검 완료'}
      </Button>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 체크박스 항목
// -----------------------------------------------------------------------------

function CheckItem({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItem
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary"
      />
      <span className="text-sm leading-relaxed">
        {item.item_name}
        {item.is_required && (
          <span className="ml-1 text-destructive font-medium">*</span>
        )}
      </span>
    </label>
  )
}

// -----------------------------------------------------------------------------
// 사진 업로드 항목
// -----------------------------------------------------------------------------

function PhotoItem({
  item,
  value,
  uploading,
  onChange,
  onClear,
}: {
  item: ChecklistItem
  value: string
  uploading: boolean
  onChange: (file: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasPhoto = value.length > 0

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm">
          {item.item_name}
          {item.is_required && (
            <span className="ml-1 text-destructive font-medium">*</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          사진
        </span>
      </div>

      {hasPhoto ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={item.item_name}
            className="w-full max-h-48 object-cover rounded-md"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="사진 제거"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            사진 등록 완료
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 py-6 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
        >
          <Camera className="h-6 w-6" />
          <span className="text-xs">
            {uploading ? '업로드 중...' : '사진 촬영 또는 선택'}
          </span>
        </button>
      )}

      {/* capture="environment": 모바일에서 후면 카메라 우선 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onChange(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
