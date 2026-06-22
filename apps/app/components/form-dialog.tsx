// =============================================================================
// 폼 다이얼로그용 DialogContent 래퍼.
// 바깥 영역 클릭 시 닫히지 않도록 onInteractOutside를 기본 차단한다.
// 폼이 포함된 모든 Dialog에서 DialogContent 대신 이 컴포넌트를 사용한다.
// =============================================================================

import type { ComponentPropsWithoutRef } from 'react'
import { DialogContent } from '@spotcare/ui/components/dialog'

type Props = ComponentPropsWithoutRef<typeof DialogContent>

export function FormDialogContent({ onInteractOutside, ...props }: Props) {
  return (
    <DialogContent
      onInteractOutside={(e) => {
        e.preventDefault()
        onInteractOutside?.(e)
      }}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@spotcare/ui/components/dialog'
