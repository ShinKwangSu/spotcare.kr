'use client'

// =============================================================================
// spotcare.kr MVP — 워크스페이스 생성/수정 Dialog
// =============================================================================
// - 층수 입력 규약(UI 계약): 지상은 max_floor(0 이상), 지하는 "깊이"를 양수로 입력.
//   Server Action 이 지하 값을 음수로 변환 저장한다.
// - Daum 주소 검색 API: 버튼 클릭 시 스크립트 lazy-load → 팝업 오픈.
//   address 는 Daum API 반환값으로 채워지고(읽기 전용), address_detail 만 수동 입력.
// =============================================================================

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, MapPin } from 'lucide-react'
import { toast } from 'sonner'

import { createWorkspace, updateWorkspace } from '@/app/actions/workspace'
import type { Workspace } from '@/types/database'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@spotcare/ui/components/form'
import { Button } from '@spotcare/ui/components/button'
import { Input } from '@spotcare/ui/components/input'

// -----------------------------------------------------------------------------
// Daum 주소 검색 타입
// -----------------------------------------------------------------------------

type DaumPostcodeResult = {
  roadAddress: string
  jibunAddress: string
  zonecode: string
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeResult) => void
      }) => { open: () => void }
    }
  }
}

function loadDaumPostcodeScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.daum?.Postcode) {
      resolve()
      return
    }
    const existing = document.querySelector('script[data-daum-postcode]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      return
    }
    const script = document.createElement('script')
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.setAttribute('data-daum-postcode', '')
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
}

// -----------------------------------------------------------------------------
// 클라이언트 검증 스키마
// -----------------------------------------------------------------------------

const formSchema = z.object({
  workspace_name: z
    .string()
    .trim()
    .min(1, '워크스페이스 이름을 입력해주세요.')
    .max(255, '255자 이내로 입력해주세요.'),
  max_floor: z.coerce
    .number({ invalid_type_error: '숫자를 입력해주세요.' })
    .int('정수로 입력해주세요.')
    .min(0, '0 이상이어야 합니다.')
    .max(200, '값이 너무 큽니다.'),
  min_floor: z.coerce
    .number({ invalid_type_error: '숫자를 입력해주세요.' })
    .int('정수로 입력해주세요.')
    .min(0, '0 이상의 깊이로 입력해주세요.')
    .max(50, '값이 너무 깊습니다.'),
  address: z.string().max(255).nullable().optional(),
  address_detail: z.string().max(255).optional(),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  workspace?: Workspace
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function WorkspaceFormDialog({ workspace, trigger, open: openProp, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp! : internalOpen
  const setOpen = (v: boolean) => { if (!isControlled) setInternalOpen(v); onOpenChange?.(v) }
  const [isPending, startTransition] = useTransition()
  const [isLoadingAddr, setIsLoadingAddr] = useState(false)
  const isEdit = !!workspace

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspace_name: workspace?.workspace_name ?? '',
      max_floor: workspace?.max_floor ?? 0,
      // DB 의 음수 min_floor 를 UI 의 양수 깊이로 환산해 프리필.
      min_floor: workspace ? Math.abs(workspace.min_floor) : 0,
      address: workspace?.address ?? null,
      address_detail: workspace?.address_detail ?? '',
    },
  })

  async function handleAddressSearch() {
    setIsLoadingAddr(true)
    try {
      await loadDaumPostcodeScript()
    } finally {
      setIsLoadingAddr(false)
    }
    new window.daum!.Postcode({
      oncomplete: (data) => {
        const addr = data.roadAddress || data.jibunAddress
        form.setValue('address', addr, { shouldValidate: true })
        form.setValue('address_detail', '', { shouldValidate: false })
        setTimeout(() => {
          document.getElementById('address_detail_input')?.focus()
        }, 100)
      },
    }).open()
  }

  function onSubmit(values: FormValues) {
    const formData = new FormData()
    formData.set('workspace_name', values.workspace_name)
    formData.set('max_floor', String(values.max_floor))
    formData.set('min_floor', String(values.min_floor))
    if (values.address) formData.set('address', values.address)
    if (values.address_detail) formData.set('address_detail', values.address_detail)

    startTransition(async () => {
      const result = isEdit
        ? await updateWorkspace(workspace.id, formData)
        : await createWorkspace(formData)

      if (result.success) {
        toast.success(isEdit ? '워크스페이스를 수정했습니다.' : '워크스페이스를 추가했습니다.')
        setOpen(false)
        if (!isEdit) form.reset()
      } else {
        toast.error(result.error)
      }
    })
  }

  const addressValue = form.watch('address')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && !isEdit) form.reset()
      }}
    >
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="h-4 w-4" />
              워크스페이스 추가
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? '워크스페이스 수정' : '워크스페이스 추가'}
          </DialogTitle>
          <DialogDescription>
            건물/장소를 등록하고 층수 범위를 지정하세요. 층수는 시설 등록 시
            드롭다운으로 사용됩니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="workspace_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>워크스페이스 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="본사 빌딩" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 주소 검색 */}
            <FormField
              control={form.control}
              name="address"
              render={() => (
                <FormItem>
                  <FormLabel>주소 <span className="text-muted-foreground font-normal">(선택)</span></FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {addressValue ? (
                        <div className="flex-1 flex items-center gap-2 rounded-md border px-3 py-2 bg-muted text-sm text-muted-foreground min-w-0">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-foreground" />
                          <span className="truncate text-foreground">{addressValue}</span>
                        </div>
                      ) : (
                        <Input
                          readOnly
                          placeholder="주소 검색 버튼을 눌러주세요."
                          className="flex-1 cursor-default"
                          onClick={handleAddressSearch}
                        />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoadingAddr}
                        onClick={handleAddressSearch}
                        className="shrink-0"
                      >
                        <Search className="h-3.5 w-3.5 mr-1.5" />
                        {isLoadingAddr ? '로딩...' : '검색'}
                      </Button>
                    </div>

                    {addressValue && (
                      <Input
                        id="address_detail_input"
                        placeholder="상세 주소 입력 (동, 호수 등)"
                        {...form.register('address_detail')}
                      />
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>지하 최저 층</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          지하
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          className="w-20"
                          {...field}
                        />
                        <span className="text-sm text-muted-foreground">
                          층
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>지상 최고 층</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          지상
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          className="w-20"
                          {...field}
                        />
                        <span className="text-sm text-muted-foreground">
                          층
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormDescription>
              지하가 없으면 0 으로 두세요. (예: 지하 2층 → 2 입력)
            </FormDescription>

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
