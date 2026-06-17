'use client'

// =============================================================================
// TenantsTable — 테넌트 목록 테이블 + 검색 + 페이지네이션 + 삭제
// =============================================================================
// nuqs 로 page/search URL 상태 관리, useTenants(page, search) 로 데이터 소비.
// 검색은 로컬 입력값을 debounce 해 URL(search)에 반영하고 page 를 1로 리셋한다.
// 삭제는 확인 Dialog 후 useDeleteTenant() 뮤테이션.
// =============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  useQueryState,
  parseAsInteger,
  parseAsString,
} from 'nuqs'
import { toast } from 'sonner'
import { Eye, Search, Trash2 } from 'lucide-react'

import { useTenants, useDeleteTenant, type TenantDto } from '@/domain/tenant'
import { Pagination } from '@/components/pagination'
import { Button } from '@spotcare/ui/components/button'
import { Input } from '@spotcare/ui/components/input'
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

export function TenantsTable() {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [search, setSearch] = useQueryState(
    'search',
    parseAsString.withDefault('')
  )

  // 검색 입력 로컬 상태 → debounce 후 URL 반영
  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => {
    // URL(search)이 외부에서 바뀌면 입력값도 동기화
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === search) return
    const timer = setTimeout(() => {
      setSearch(trimmed || null)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const { data, isLoading, isError } = useTenants(page, search || undefined)
  const { mutate: deleteTenant, isPending: isDeleting } = useDeleteTenant()

  const [target, setTarget] = useState<TenantDto | null>(null)

  const handleDelete = () => {
    if (!target) return
    deleteTenant(target.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success('테넌트가 삭제되었습니다.')
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
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="업체명 또는 이메일 검색"
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>업체명</TableHead>
              <TableHead>관리자명</TableHead>
              <TableHead className="hidden md:table-cell">이메일</TableHead>
              <TableHead className="hidden md:table-cell">전화번호</TableHead>
              <TableHead className="hidden lg:table-cell">가입일</TableHead>
              <TableHead className="w-[120px] text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-destructive"
                >
                  테넌트 목록을 불러오는 중 오류가 발생했습니다.
                </TableCell>
              </TableRow>
            ) : data && data.tenants.length > 0 ? (
              data.tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    {tenant.companyName}
                  </TableCell>
                  <TableCell>{tenant.adminName}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {tenant.email}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {tenant.phone}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {new Date(tenant.createdAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={`/dashboard/tenants/${tenant.id}`}
                          aria-label="상세"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="삭제"
                        onClick={() => setTarget(tenant)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {search
                    ? '검색 결과가 없습니다.'
                    : '등록된 테넌트가 없습니다.'}
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

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>테넌트 삭제</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {target?.companyName}
              </span>{' '}
              업체를 삭제하시겠습니까? 연관된 워크스페이스와 시설 데이터가 함께
              삭제되며 되돌릴 수 없습니다.
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
