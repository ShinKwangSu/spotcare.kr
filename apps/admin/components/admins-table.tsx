'use client'

// =============================================================================
// AdminsTable — 어드민 목록 테이블 + 페이지네이션 + 삭제
// =============================================================================
// useAdmins(page) 로 데이터 소비, nuqs 로 page URL 상태 관리.
// 삭제는 확인 Dialog 후 useDeleteAdmin() 뮤테이션.
// 본인 계정(currentAdminId) 행은 삭제 버튼 비활성화.
// =============================================================================

import { useState } from 'react'
import Link from 'next/link'
import { useQueryState, parseAsInteger } from 'nuqs'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'

import { useAdmins, useDeleteAdmin, type AdminDto } from '@/domain/admin'
import { Pagination } from '@/components/pagination'
import { Button } from '@spotcare/ui/components/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@spotcare/ui/components/table'
import { Skeleton } from '@spotcare/ui/components/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@spotcare/ui/components/dialog'

export function AdminsTable({ currentAdminId }: { currentAdminId: string }) {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const { data, isLoading, isError } = useAdmins(page)
  const { mutate: deleteAdmin, isPending: isDeleting } = useDeleteAdmin()

  const [target, setTarget] = useState<AdminDto | null>(null)

  const handleDelete = () => {
    if (!target) return
    deleteAdmin(target.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success('어드민이 삭제되었습니다.')
          setTarget(null)
        } else {
          toast.error(result.error ?? '삭제에 실패했습니다.')
        }
      },
      onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
    })
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead className="hidden md:table-cell">생성일</TableHead>
              <TableHead className="w-[140px] text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-8 w-28" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-destructive"
                >
                  어드민 목록을 불러오는 중 오류가 발생했습니다.
                </TableCell>
              </TableRow>
            ) : data && data.admins.length > 0 ? (
              data.admins.map((admin) => {
                const isSelf = admin.id === currentAdminId
                return (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(admin.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/dashboard/admins/${admin.id}`}
                            aria-label="수정"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isSelf}
                          aria-label="삭제"
                          onClick={() => setTarget(admin)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  등록된 어드민이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(next) => setPage(next)}
      />

      <Dialog
        open={!!target}
        onOpenChange={(open) => !open && setTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>어드민 삭제</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {target?.name}
              </span>{' '}
              ({target?.email}) 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
