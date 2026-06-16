'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import {
  createChecklist,
  updateChecklist,
  deleteChecklist,
} from '@/app/actions/checklist'
import { checklistSchema, type ChecklistInput } from '@/lib/validations/checklist'
import type { Checklist } from '@/types/database'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@spotcare/ui/components/select'
import { Button } from '@spotcare/ui/components/button'
import { Input } from '@spotcare/ui/components/input'
import { Textarea } from '@spotcare/ui/components/textarea'
import { Checkbox } from '@spotcare/ui/components/checkbox'
import { ConfirmDeleteButton } from '@/components/confirm-delete-button'

const DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

const CYCLE_LABEL: Record<string, string> = {
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
}

type Props = {
  workspaceId: string
  checklists: Checklist[]
}

export function ChecklistManager({ workspaceId, checklists }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>점검표</CardTitle>
          <CardDescription>총 {checklists.length}개</CardDescription>
        </div>
        <ChecklistFormDialog workspaceId={workspaceId} />
      </CardHeader>
      <CardContent>
        {checklists.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              아직 등록된 점검표가 없습니다. 점검표를 추가하세요.
            </p>
            <ChecklistFormDialog workspaceId={workspaceId} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>점검표명</TableHead>
                <TableHead>반복 주기</TableHead>
                <TableHead>횟수</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checklists.map((checklist) => (
                <TableRow key={checklist.id}>
                  <TableCell className="font-medium">
                    {checklist.checklist_name}
                  </TableCell>
                  <TableCell>
                    {CYCLE_LABEL[checklist.repeat_cycle]}
                    {checklist.repeat_cycle === 'weekly' &&
                      checklist.days &&
                      checklist.days.length > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          ({checklist.days.map((d) => DAYS[d]).join(', ')})
                        </span>
                      )}
                  </TableCell>
                  <TableCell>{checklist.count}회</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ChecklistFormDialog
                        workspaceId={workspaceId}
                        checklist={checklist}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="수정">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <ConfirmDeleteButton
                        onConfirm={() =>
                          deleteChecklist(checklist.id, workspaceId)
                        }
                        title="점검표를 삭제하시겠습니까?"
                        description="삭제한 점검표는 복구할 수 없습니다."
                        successMessage="점검표를 삭제했습니다."
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

function ChecklistFormDialog({
  workspaceId,
  checklist,
  trigger,
}: {
  workspaceId: string
  checklist?: Checklist
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!checklist

  const form = useForm<ChecklistInput>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      checklist_name: checklist?.checklist_name ?? '',
      description: checklist?.description ?? '',
      repeat_cycle: checklist?.repeat_cycle ?? 'daily',
      count: checklist?.count ?? 1,
      days: checklist?.days ?? [],
    },
  })

  const repeatCycle = form.watch('repeat_cycle')

  function onSubmit(values: ChecklistInput) {
    const formData = new FormData()
    formData.set('checklist_name', values.checklist_name)
    if (values.description) formData.set('description', values.description)
    formData.set('repeat_cycle', values.repeat_cycle)
    formData.set('count', String(values.count))
    if (values.repeat_cycle === 'weekly') {
      formData.set('days', JSON.stringify(values.days ?? []))
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateChecklist(checklist.id, workspaceId, formData)
        : await createChecklist(workspaceId, formData)

      if (result.success) {
        toast.success(isEdit ? '점검표를 수정했습니다.' : '점검표를 추가했습니다.')
        setOpen(false)
        if (!isEdit) {
          form.reset({
            checklist_name: '',
            description: '',
            repeat_cycle: 'daily',
            count: 1,
            days: [],
          })
        }
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
            checklist_name: checklist?.checklist_name ?? '',
            description: checklist?.description ?? '',
            repeat_cycle: checklist?.repeat_cycle ?? 'daily',
            count: checklist?.count ?? 1,
            days: checklist?.days ?? [],
          })
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            점검표 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '점검표 수정' : '점검표 추가'}</DialogTitle>
          <DialogDescription>점검표 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="checklist_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>점검표명 *</FormLabel>
                  <FormControl>
                    <Input placeholder="소화기 점검" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="점검 내용을 간략히 입력하세요."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repeat_cycle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>반복 주기 *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="주기 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">매일</SelectItem>
                      <SelectItem value="weekly">매주</SelectItem>
                      <SelectItem value="monthly">매월</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>횟수 *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {repeatCycle === 'weekly' && (
              <FormField
                control={form.control}
                name="days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>요일</FormLabel>
                    <div className="flex flex-wrap gap-3">
                      {DAYS.map((label, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`day-${idx}`}
                            checked={field.value?.includes(idx) ?? false}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? []
                              field.onChange(
                                checked
                                  ? [...current, idx].sort((a, b) => a - b)
                                  : current.filter((d) => d !== idx)
                              )
                            }}
                          />
                          <label
                            htmlFor={`day-${idx}`}
                            className="text-sm cursor-pointer"
                          >
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
