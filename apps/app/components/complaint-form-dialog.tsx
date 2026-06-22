'use client'

// =============================================================================
// spotcare.kr MVP — 방문자용 민원 접수 모달
// =============================================================================
// /inspect/[facilityId] 페이지 하단 "민원 접수" 버튼 → Dialog
// 민원 유형 4종(고정) Select + "직접 입력" 선택 시 추가 텍스트 필드
// 내용 Textarea (필수) + 사진 최대 3장 (선택)
// 유형 미선택 또는 내용 빈 값이면 접수 버튼 비활성화
// =============================================================================

import { useState, useRef, useTransition } from 'react'
import { MessageSquarePlus, X, ImagePlus } from 'lucide-react'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FormDialogContent as DialogContent,
} from '@/components/form-dialog'
import { Button } from '@spotcare/ui/components/button'
import { Textarea } from '@spotcare/ui/components/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@spotcare/ui/components/select'
import { COMPLAINT_TYPE_OPTIONS } from '@/types/database'
import { submitComplaint, uploadComplaintPhoto } from '@/app/actions/complaint'

const MAX_PHOTOS = 3

type Props = {
  facilityId: string
}

export function ComplaintFormDialog({ facilityId }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [content, setContent] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isValid = selectedType.length > 0 && content.trim().length > 0

  function handleClose(next: boolean) {
    if (!next) {
      setSelectedType('')
      setContent('')
      setPhotoFiles([])
      setPhotoPreviews([])
      setError('')
      setDone(false)
    }
    setOpen(next)
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const remaining = MAX_PHOTOS - photoFiles.length
    const toAdd = files.slice(0, remaining)

    setPhotoFiles((prev) => [...prev, ...toAdd])
    toAdd.forEach((file) => {
      const url = URL.createObjectURL(file)
      setPhotoPreviews((prev) => [...prev, url])
    })

    // input 초기화 (같은 파일 재선택 허용)
    e.target.value = ''
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviews[index])
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    if (!isValid || isPending) return
    setError('')

    startTransition(async () => {
      // 사진 업로드
      const uploadedUrls: string[] = []
      for (const file of photoFiles) {
        const fd = new FormData()
        fd.set('file', file)
        const result = await uploadComplaintPhoto(facilityId, fd)
        if (!result.success) {
          setError(result.error)
          return
        }
        uploadedUrls.push(result.url)
      }

      // 민원 접수
      const result = await submitComplaint(facilityId, {
        complaint_type: selectedType,
        content: content.trim(),
        photo_urls: uploadedUrls,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setDone(true)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          민원 접수
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>민원 접수</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm font-medium">접수가 완료되었습니다.</p>
            <p className="text-xs text-muted-foreground">
              담당자가 확인 후 처리할 예정입니다.
            </p>
            <Button className="w-full" onClick={() => handleClose(false)}>
              닫기
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 민원 유형 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                민원 유형 <span className="text-destructive">*</span>
              </label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="유형을 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            {/* 내용 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                내용 <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="불편 사항이나 의견을 자유롭게 작성해주세요."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                maxLength={2000}
              />
            </div>

            {/* 사진 첨부 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                사진{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (선택, 최대 {MAX_PHOTOS}장)
                </span>
              </label>

              {photoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photoPreviews.map((src, i) => (
                    <div key={i} className="relative h-20 w-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`첨부 사진 ${i + 1}`}
                        className="h-20 w-20 rounded-md object-cover border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        aria-label="사진 제거"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photoFiles.length < MAX_PHOTOS && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    사진 추가
                  </Button>
                </>
              )}
            </div>

            {/* 에러 */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* 접수 버튼 */}
            <Button
              className="w-full"
              disabled={!isValid || isPending}
              onClick={handleSubmit}
            >
              {isPending ? '접수 중...' : '접수하기'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
