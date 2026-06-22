'use client'

// =============================================================================
// spotcare.kr MVP — 시설 정보 관리 (Table + 등록/수정/삭제 Form)
// =============================================================================
// 핵심 규칙:
//   - 층수는 항상 generateFloorOptions(max, min) + Select 로 입력(직접 숫자 입력 금지).
//   - Select 의 value 는 floor 정수를 그대로 제출(역변환 불필요).
//   - Table 의 층 표시는 floorToDisplay(floor).
//   - 시설 타입도 Select 로 선택(facilityTypes 목록).
// 액션 시그니처:
//   createFacility(workspaceId, formData)
//   updateFacility(id, workspaceId, formData)
//   deleteFacility(id, workspaceId)
// =============================================================================

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, MoreVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createFacility,
  updateFacility,
  deleteFacility,
} from '@/app/actions/facility'
import {
  floorToDisplay,
  generateFloorOptions,
} from '@/lib/utils/floor'
import type { Checklist, Facility, FacilityType, FacilityWithChecklists, Workspace } from '@/types/database'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@spotcare/ui/components/dropdown-menu'
import { ConfirmDeleteButton } from '@/components/confirm-delete-button'
import { FacilityQrDialog } from '@/components/facility-qr-dialog'

// 클라이언트 검증 스키마.
const formSchema = z.object({
  facility_name: z
    .string()
    .trim()
    .min(1, '시설 이름을 입력해주세요.')
    .max(255, '255자 이내로 입력해주세요.'),
  floor: z.coerce
    .number({ invalid_type_error: '층을 선택해주세요.' })
    .int('층을 선택해주세요.'),
  facility_type_id: z.string().uuid('시설 타입을 선택해주세요.'),
  memo: z.string().trim().max(2000).optional(),
  checklist_id: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  workspace: Workspace
  facilityTypes: FacilityType[]
  facilities: FacilityWithChecklists[]
  checklists: Checklist[]
}

export function FacilityManager({
  workspace,
  facilityTypes,
  facilities,
  checklists,
}: Props) {
  const typeNameById = new Map(facilityTypes.map((t) => [t.id, t.type_name]))
  const checklistNameById = new Map(checklists.map((cl) => [cl.id, cl.checklist_name]))
  const hasTypes = facilityTypes.length > 0
  const floorOptions = generateFloorOptions(workspace.max_floor, workspace.min_floor)
  const hasFloors = floorOptions.length > 0
  const canRegister = hasTypes && hasFloors

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>시설 목록</CardTitle>
          <CardDescription>총 {facilities.length}개의 시설</CardDescription>
        </div>
        <FacilityFormDialog
          workspace={workspace}
          facilityTypes={facilityTypes}
          floorOptions={floorOptions}
          checklists={checklists}
          disabled={!canRegister}
        />
      </CardHeader>
      <CardContent>
        {!hasTypes ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            시설을 등록하려면 먼저 시설 타입을 추가하세요.
          </p>
        ) : !hasFloors ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            등록 가능한 층이 없습니다. 워크스페이스의 층수 범위를 먼저 설정하세요.
          </p>
        ) : facilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              아직 등록된 시설이 없습니다.
            </p>
            <FacilityFormDialog
              workspace={workspace}
              facilityTypes={facilityTypes}
              floorOptions={floorOptions}
              checklists={checklists}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시설명</TableHead>
                <TableHead>층</TableHead>
                <TableHead>시설 타입</TableHead>
                <TableHead>점검표</TableHead>
                <TableHead className="hidden md:table-cell">메모</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    {f.facility_name}
                  </TableCell>
                  <TableCell>{floorToDisplay(f.floor)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {typeNameById.get(f.facility_type_id) ?? '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.facility_checklists[0]?.checklist_id
                      ? (checklistNameById.get(f.facility_checklists[0].checklist_id) ?? '-')
                      : '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                    {f.memo || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <FacilityRowActions
                      workspace={workspace}
                      facilityTypes={facilityTypes}
                      floorOptions={floorOptions}
                      checklists={checklists}
                      facility={f}
                    />
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

function FacilityFormDialog({
  workspace,
  facilityTypes,
  floorOptions,
  checklists,
  facility,
  trigger,
  disabled,
  open: openProp,
  onOpenChange,
}: {
  workspace: Workspace
  facilityTypes: FacilityType[]
  floorOptions: { value: number; label: string }[]
  checklists: Checklist[]
  facility?: FacilityWithChecklists
  trigger?: React.ReactNode
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp! : internalOpen
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v) }
  const [isPending, startTransition] = useTransition()
  const isEdit = !!facility

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      facility_name: facility?.facility_name ?? '',
      floor: facility?.floor ?? floorOptions[0]?.value,
      facility_type_id: facility?.facility_type_id ?? '',
      memo: facility?.memo ?? '',
      checklist_id: facility?.facility_checklists?.[0]?.checklist_id ?? undefined,
    },
  })

  function resetForm() {
    form.reset({
      facility_name: facility?.facility_name ?? '',
      floor: facility?.floor ?? floorOptions[0]?.value,
      facility_type_id: facility?.facility_type_id ?? '',
      memo: facility?.memo ?? '',
      checklist_id: facility?.facility_checklists?.[0]?.checklist_id ?? undefined,
    })
  }

  function onSubmit(values: FormValues) {
    const formData = new FormData()
    formData.set('facility_name', values.facility_name)
    formData.set('floor', String(values.floor))
    formData.set('facility_type_id', values.facility_type_id)
    formData.set('memo', values.memo ?? '')
    formData.set('checklist_id', values.checklist_id ?? '')

    startTransition(async () => {
      const result = isEdit
        ? await updateFacility(facility.id, workspace.id, formData)
        : await createFacility(workspace.id, formData)

      if (result.success) {
        toast.success(isEdit ? '시설을 수정했습니다.' : '시설을 등록했습니다.')
        setOpen(false)
        if (!isEdit) resetForm()
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
        if (next) resetForm()
      }}
    >
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" disabled={disabled}>
              <Plus className="h-4 w-4" />
              시설 등록
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '시설 수정' : '시설 등록'}</DialogTitle>
          <DialogDescription>
            층수는 워크스페이스 범위 내에서 선택합니다.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="facility_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>시설명</FormLabel>
                  <FormControl>
                    <Input placeholder="3층 남자 화장실" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>층 수</FormLabel>
                    <Select
                      value={
                        field.value !== undefined && field.value !== null
                          ? String(field.value)
                          : undefined
                      }
                      onValueChange={(val) => field.onChange(Number(val))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="층 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {floorOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={String(opt.value)}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="facility_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시설 타입</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="타입 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {facilityTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.type_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    메모 <span className="text-muted-foreground">(선택)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="위치 설명, 특이사항 등"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {checklists.length > 0 && (
              <FormField
                control={form.control}
                name="checklist_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      점검표{' '}
                      <span className="text-muted-foreground">(선택)</span>
                    </FormLabel>
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(val) =>
                        field.onChange(val === '__none__' ? undefined : val)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="점검표 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">선택 안 함</SelectItem>
                        {checklists.map((cl) => (
                          <SelectItem key={cl.id} value={cl.id}>
                            {cl.checklist_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? '저장 중...' : isEdit ? '수정' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function FacilityRowActions({
  workspace,
  facilityTypes,
  floorOptions,
  checklists,
  facility,
}: {
  workspace: Workspace
  facilityTypes: FacilityType[]
  floorOptions: { value: number; label: string }[]
  checklists: Checklist[]
  facility: FacilityWithChecklists
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      {facility.facility_checklists[0]?.checklist_id && (
        <FacilityQrDialog facility={facility} />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="더 보기">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FacilityFormDialog
        workspace={workspace}
        facilityTypes={facilityTypes}
        floorOptions={floorOptions}
        checklists={checklists}
        facility={facility}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDeleteButton
        onConfirm={() => deleteFacility(facility.id, workspace.id)}
        title="시설을 삭제하시겠습니까?"
        successMessage="시설을 삭제했습니다."
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
