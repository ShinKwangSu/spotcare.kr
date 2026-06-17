'use client'

// =============================================================================
// AdminEditForm — 어드민 이름/이메일 수정 폼
// =============================================================================
// useAdmin(adminId) 로 데이터 소비, useUpdateAdmin(adminId) 뮤테이션(FormData).
// react-hook-form + zod 검증. 성공 시 toast.
// =============================================================================

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { useAdmin, useUpdateAdmin } from '@/domain/admin'
import { Button } from '@spotcare/ui/components/button'
import { Input } from '@spotcare/ui/components/input'
import { Label } from '@spotcare/ui/components/label'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@spotcare/ui/components/card'
import { Skeleton } from '@spotcare/ui/components/skeleton'

const schema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요.'),
  email: z.string().trim().email('올바른 이메일 형식이 아닙니다.'),
})

type FormValues = z.infer<typeof schema>

export function AdminEditForm({ adminId }: { adminId: string }) {
  const { data, isLoading, isError } = useAdmin(adminId)
  const { mutate: updateAdmin, isPending } = useUpdateAdmin(adminId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  })

  // 서버 데이터 도착 시 폼 기본값 동기화 (useEffect는 데이터 패칭이 아닌 폼 초기화용)
  useEffect(() => {
    if (data) reset({ name: data.name, email: data.email })
  }, [data, reset])

  const onSubmit = (values: FormValues) => {
    const formData = new FormData()
    formData.set('name', values.name)
    formData.set('email', values.email)

    updateAdmin(formData, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success('어드민 정보가 수정되었습니다.')
        } else {
          toast.error(result.error ?? '수정에 실패했습니다.')
        }
      },
      onError: () => toast.error('수정 중 오류가 발생했습니다.'),
    })
  }

  if (isError) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        어드민 정보를 불러오는 중 오류가 발생했습니다.
      </p>
    )
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-lg">기본 정보</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {isLoading || !data ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
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
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isPending || isLoading || !data}>
            {isPending ? '저장 중...' : '저장'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
