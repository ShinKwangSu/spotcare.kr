'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import {
  createInspector,
  updateInspector,
  deleteInspector,
} from '@/app/actions/inspector'
import { inspectorSchema, type InspectorInput } from '@/lib/validations/inspector'
import { formatPhone } from '@/lib/utils/phone'
import type { Inspector } from '@/types/database'
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@spotcare/ui/components/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@spotcare/ui/components/form'
import { Button } from '@spotcare/ui/components/button'
import { Input } from '@spotcare/ui/components/input'
import { ConfirmDeleteButton } from '@/components/confirm-delete-button'

type Props = {
  inspectors: Inspector[]
}

export function InspectorManager({ inspectors }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>점검자</CardTitle>
          <CardDescription>총 {inspectors.length}명</CardDescription>
        </div>
        <InspectorFormDialog />
      </CardHeader>
      <CardContent>
        {inspectors.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              아직 등록된 점검자가 없습니다. 점검자를 추가하세요.
            </p>
            <InspectorFormDialog />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>전화번호</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspectors.map((inspector) => (
                <TableRow key={inspector.id}>
                  <TableCell className="font-medium">{inspector.name}</TableCell>
                  <TableCell>{inspector.phone ?? '-'}</TableCell>
                  <TableCell>{inspector.email ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <InspectorFormDialog
                        inspector={inspector}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="수정">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <ConfirmDeleteButton
                        onConfirm={() => deleteInspector(inspector.id)}
                        title="점검자를 삭제하시겠습니까?"
                        description="삭제한 점검자 정보는 복구할 수 없습니다."
                        successMessage="점검자를 삭제했습니다."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function InspectorFormDialog({
  inspector,
  trigger,
}: {
  inspector?: Inspector
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!inspector

  const form = useForm<InspectorInput>({
    resolver: zodResolver(inspectorSchema),
    defaultValues: {
      name: inspector?.name ?? '',
      phone: inspector?.phone ? formatPhone(inspector.phone) : '',
      email: inspector?.email ?? '',
    },
  })

  function onSubmit(values: InspectorInput) {
    const formData = new FormData()
    formData.set('name', values.name)
    if (values.phone) formData.set('phone', values.phone)
    if (values.email) formData.set('email', values.email)

    startTransition(async () => {
      const result = isEdit
        ? await updateInspector(inspector.id, formData)
        : await createInspector(formData)

      if (result.success) {
        toast.success(isEdit ? '점검자를 수정했습니다.' : '점검자를 추가했습니다.')
        setOpen(false)
        if (!isEdit) form.reset({ name: '', phone: '', email: '' })
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          form.reset({
            name: inspector?.name ?? '',
            phone: inspector?.phone ? formatPhone(inspector.phone) : '',
            email: inspector?.email ?? '',
          })
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            점검자 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '점검자 수정' : '점검자 추가'}</DialogTitle>
          <DialogDescription>
            점검 담당자 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="홍길동" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>전화번호</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="010-0000-0000"
                      inputMode="numeric"
                      maxLength={13}
                      {...field}
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example@company.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? '저장 중...' : isEdit ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
