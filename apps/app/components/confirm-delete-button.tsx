'use client'

// =============================================================================
// spotcare.kr MVP — 삭제 확인 버튼 (재사용)
// =============================================================================
// Dialog 로 삭제 확인을 받고, 전달된 onConfirm(서버 액션 래퍼)을 실행한다.
// onConfirm 은 ActionResult 를 반환해야 하며, 결과에 따라 toast 로 피드백한다.
// =============================================================================

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { ActionResult } from '@/app/actions/workspace'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@spotcare/ui/components/dialog'
import { Button } from '@spotcare/ui/components/button'

type Props = {
  onConfirm: () => Promise<ActionResult>
  title?: string
  description?: string
  successMessage?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ConfirmDeleteButton({
  onConfirm,
  title = '삭제하시겠습니까?',
  description = '이 작업은 되돌릴 수 없습니다.',
  successMessage = '삭제했습니다.',
  trigger,
  open: openProp,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp! : internalOpen
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v) }
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await onConfirm()
      if (result.success) {
        toast.success(successMessage)
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon" aria-label="삭제">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              취소
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
