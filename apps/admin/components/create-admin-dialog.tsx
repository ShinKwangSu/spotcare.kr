'use client'

// =============================================================================
// CreateAdminDialog — 어드민 생성 Dialog
// =============================================================================
// react-hook-form + zod 검증, useCreateAdmin() 뮤테이션(FormData).
// 성공 시 Dialog 닫기 + toast. 임시 비밀번호(12341234)는 서버가 발급한다.
// =============================================================================

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

import { useCreateAdmin } from '@/domain/admin'
import { Button } from '@spotcare/ui/components/button'
import { Input } from '@spotcare/ui/components/input'
import { Label } from '@spotcare/ui/components/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@spotcare/ui/components/dialog'

const schema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요.'),
  email: z.string().trim().email('올바른 이메일 형식이 아닙니다.'),
})

type FormValues = z.infer<typeof schema>

export function CreateAdminDialog() {
  const [open, setOpen] = useState(false)
  const { mutate: createAdmin, isPending } = useCreateAdmin()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  })

  const onSubmit = (values: FormValues) => {
    const formData = new FormData()
    formData.set('name', values.name)
    formData.set('email', values.email)

    createAdmin(formData, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success('어드민이 생성되었습니다. (임시 비밀번호: 12341234)')
          reset()
          setOpen(false)
        } else {
          toast.error(result.error ?? '생성에 실패했습니다.')
        }
      },
      onError: () => toast.error('생성 중 오류가 발생했습니다.'),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          어드민 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>어드민 추가</DialogTitle>
            <DialogDescription>
              새 슈퍼어드민 계정을 생성합니다. 임시 비밀번호 12341234 가
              발급되며 최초 로그인 후 변경해야 합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                placeholder="홍길동"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@spotcare.kr"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
