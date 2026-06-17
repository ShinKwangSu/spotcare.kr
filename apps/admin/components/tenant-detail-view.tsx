'use client'

// =============================================================================
// TenantDetailView — 테넌트 상세 (수정 폼 + 워크스페이스 목록)
// =============================================================================
// useTenant(tenantId) 로 데이터 소비, useUpdateTenant(tenantId) 뮤테이션(FormData).
// 수정: 업체명/관리자명/전화번호 · 읽기 전용: 이메일/가입일.
// 하단: 워크스페이스 목록(읽기 전용). 층수는 floorToDisplay 로 표시.
// =============================================================================

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { useTenant, useUpdateTenant } from '@/domain/tenant'
import { floorToDisplay } from '@spotcare/database'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@spotcare/ui/components/table'
import { Skeleton } from '@spotcare/ui/components/skeleton'

const schema = z.object({
  companyName: z.string().trim().min(1, '업체명을 입력해주세요.'),
  adminName: z.string().trim().min(1, '관리자명을 입력해주세요.'),
  phone: z.string().trim().min(1, '전화번호를 입력해주세요.'),
})

type FormValues = z.infer<typeof schema>

export function TenantDetailView({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError } = useTenant(tenantId)
  const { mutate: updateTenant, isPending } = useUpdateTenant(tenantId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { companyName: '', adminName: '', phone: '' },
  })

  useEffect(() => {
    if (data) {
      reset({
        companyName: data.companyName,
        adminName: data.adminName,
        phone: data.phone,
      })
    }
  }, [data, reset])

  const onSubmit = (values: FormValues) => {
    const formData = new FormData()
    formData.set('companyName', values.companyName)
    formData.set('adminName', values.adminName)
    formData.set('phone', values.phone)

    updateTenant(formData, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success('테넌트 정보가 수정되었습니다.')
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
        테넌트 정보를 불러오는 중 오류가 발생했습니다.
      </p>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-lg">업체 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">업체 정보</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">업체명</Label>
              <Input
                id="companyName"
                aria-invalid={!!errors.companyName}
                {...register('companyName')}
              />
              {errors.companyName && (
                <p className="text-sm text-destructive">
                  {errors.companyName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminName">관리자명</Label>
              <Input
                id="adminName"
                aria-invalid={!!errors.adminName}
                {...register('adminName')}
              />
              {errors.adminName && (
                <p className="text-sm text-destructive">
                  {errors.adminName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                aria-invalid={!!errors.phone}
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">이메일 (읽기 전용)</Label>
                <p className="text-sm">{data.email}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">가입일 (읽기 전용)</Label>
                <p className="text-sm">
                  {new Date(data.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            워크스페이스 ({data.workspaces.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>지상 최고층</TableHead>
                  <TableHead>지하 최저층</TableHead>
                  <TableHead className="hidden md:table-cell">생성일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.workspaces.length > 0 ? (
                  data.workspaces.map((ws) => (
                    <TableRow key={ws.id}>
                      <TableCell className="font-medium">
                        {ws.workspaceName}
                      </TableCell>
                      <TableCell>{floorToDisplay(ws.maxFloor)}</TableCell>
                      <TableCell>{floorToDisplay(ws.minFloor)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {new Date(ws.createdAt).toLocaleDateString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-20 text-center text-muted-foreground"
                    >
                      등록된 워크스페이스가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
