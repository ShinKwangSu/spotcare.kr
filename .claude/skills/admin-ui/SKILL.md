---
name: admin-ui
description: spotcare.kr apps/admin 슈퍼어드민 UI 구현 가이드. React Query 훅 + shadcn/ui + Tailwind CSS. 로그인, 테넌트 목록/상세, 운영 통계 화면. UI Engineer 에이전트가 apps/admin 화면 구현 시 반드시 이 스킬을 사용한다.
---

# Admin UI — apps/admin 슈퍼어드민 화면

> 아키텍처 패턴(prefetch, React Query 훅, Suspense, nuqs)은 `nextjs-guide` 스킬을 참조한다.

## 대상 앱 및 라우트 구조

**타겟 앱:** `apps/admin`

```
apps/admin/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          — 슈퍼어드민 로그인 (회원가입 링크 없음)
│   └── dashboard/
│       ├── layout.tsx            — 사이드바 포함 레이아웃
│       ├── page.tsx              — 운영 통계 대시보드
│       ├── tenants/
│       │   ├── page.tsx          — 테넌트 목록 (Table + 검색/페이지네이션)
│       │   └── [tenantId]/
│       │       └── page.tsx      — 테넌트 상세 (워크스페이스 목록 포함)
│       └── settings/
│           └── page.tsx          — 서비스 정책 관리 (향후 확장)
└── components/
```

## Import 규칙

```typescript
// UI 컴포넌트
import { Button, Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spotcare/ui'
import { Badge, Input } from '@spotcare/ui'

// 도메인 훅/타입
import { useTenants, useTenantDetail } from '@/domain/tenant'
import { useServiceStats } from '@/domain/stats'

// URL 상태 (필터, 페이지네이션)
import { useQueryState, parseAsInteger } from 'nuqs'
```

## 데이터 소비 패턴

### Server Component — prefetch

```typescript
// app/dashboard/tenants/page.tsx (Server Component)
import { runPrefetch } from '@/lib/react-query/prefetch'
import { tenantPrefetch } from '@/domain/tenant'
import { HydrationBoundary } from '@tanstack/react-query'
import { TenantList } from '@/components/tenant-list'

export default async function TenantsPage() {
    const state = await runPrefetch(tenantPrefetch.list({ page: 1, pageSize: 20 }))
    return (
        <HydrationBoundary state={state}>
            <TenantList />
        </HydrationBoundary>
    )
}
```

### Client Component — React Query 훅 + nuqs

```typescript
// components/tenant-list.tsx (Client Component)
'use client'
import { useTenants } from '@/domain/tenant'
import { useQueryState, parseAsInteger } from 'nuqs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spotcare/ui'

export function TenantList() {
    const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
    const { data, isLoading } = useTenants({ page, pageSize: 20 })

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>업체명</TableHead>
                        <TableHead>관리자명</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>상세</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data?.data.map((tenant) => (
                        <TableRow key={tenant.id}>
                            <TableCell>{tenant.companyName}</TableCell>
                            <TableCell>{tenant.adminName}</TableCell>
                            <TableCell>{tenant.email}</TableCell>
                            <TableCell>{new Date(tenant.createdAt).toLocaleDateString('ko-KR')}</TableCell>
                            <TableCell>
                                <a href={`/dashboard/tenants/${tenant.id}`}>보기</a>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {/* 페이지네이션 UI */}
        </>
    )
}
```

## 운영 통계 대시보드 (`dashboard/page.tsx`)

```typescript
// Server Component — stats prefetch
import { runPrefetch } from '@/lib/react-query/prefetch'
import { statsPrefetch } from '@/domain/stats'
import { HydrationBoundary } from '@tanstack/react-query'
import { StatCards } from '@/components/stat-cards'

export default async function DashboardPage() {
    const state = await runPrefetch(statsPrefetch.overview())
    return <HydrationBoundary state={state}><StatCards /></HydrationBoundary>
}

// components/stat-cards.tsx (Client Component)
export function StatCards() {
    const { data: stats } = useServiceStats()
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader><CardTitle>총 업체 수</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{stats?.tenantCount}</p></CardContent>
            </Card>
            {/* workspaceCount, facilityCount */}
        </div>
    )
}
```

## 로그인 페이지 (`(auth)/login/page.tsx`)

```typescript
// 회원가입 링크 없음 — 슈퍼어드민은 DB 직접 등록
// react-hook-form + loginAction 직접 호출 (React Query 불필요)
import { Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'
import { Input, Button } from '@spotcare/ui'
import { loginAction } from '@/domain/auth'
```

## 체크리스트

- [ ] UI 컴포넌트를 `@spotcare/ui`에서 import
- [ ] Client Component에서 서버 데이터는 도메인 React Query 훅만 사용
- [ ] 리스트/상세 페이지는 Server Component에서 prefetch + HydrationBoundary
- [ ] 페이지네이션 상태는 nuqs로 URL에 반영
- [ ] 테넌트 목록에 페이지네이션 적용
- [ ] 로그인 페이지에 회원가입 링크 없음
- [ ] `md` 이상 화면에 Table 최적화
