---
name: facility-ui
description: spotcare.kr apps/app 시설 관리 UI 구현 가이드. React Query 훅 + shadcn/ui + Tailwind CSS. 회원가입/로그인, 워크스페이스, 시설 타입, 시설 정보 CRUD 화면. UI Engineer 에이전트가 apps/app 화면 구현 시 반드시 이 스킬을 사용한다.
---

# Facility UI — apps/app 화면 구현

> 아키텍처 패턴(prefetch, React Query 훅, Suspense, nuqs)은 `nextjs-guide` 스킬을 참조한다.

## 대상 앱 및 라우트 구조

**타겟 앱:** `apps/app`

```
apps/app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── dashboard/
│       ├── layout.tsx                          — 사이드바 포함 레이아웃
│       ├── workspaces/
│       │   └── page.tsx                        — 워크스페이스 목록 + 생성
│       └── [workspaceId]/
│           ├── facility-types/
│           │   └── page.tsx                    — 시설 타입 CRUD
│           └── facilities/
│               └── page.tsx                    — 시설 정보 CRUD
└── components/                                 — 재사용 컴포넌트
```

## Import 규칙

```typescript
// UI 컴포넌트 — @spotcare/ui에서 import
import { Button, Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@spotcare/ui'
import { Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@spotcare/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@spotcare/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spotcare/ui'

// 도메인 훅/타입 — @/ alias (도메인 public API)
import { useWorkspaces, useCreateWorkspace } from '@/domain/workspace'
import { useFacilityTypes } from '@/domain/facility-type'

// 층수 변환 유틸
import { generateFloorOptions, floorToDisplay } from '@spotcare/database'
```

## 데이터 소비 패턴

### Server Component — prefetch

```typescript
// app/dashboard/workspaces/page.tsx (Server Component)
import { runPrefetch } from '@/lib/react-query/prefetch'
import { workspacePrefetch } from '@/domain/workspace'
import { HydrationBoundary } from '@tanstack/react-query'
import { WorkspaceList } from '@/components/workspace-list'

export default async function WorkspacesPage() {
    const state = await runPrefetch(workspacePrefetch.list())
    return (
        <HydrationBoundary state={state}>
            <WorkspaceList />
        </HydrationBoundary>
    )
}
```

### Client Component — React Query 훅 사용

```typescript
// components/workspace-list.tsx (Client Component)
'use client'
import { useWorkspaces } from '@/domain/workspace'

export function WorkspaceList() {
    const { data: workspaces, isLoading } = useWorkspaces()
    if (isLoading) return <WorkspaceSkeleton />
    return (
        <Table>
            {/* ... */}
        </Table>
    )
}
```

## 워크스페이스 생성 Dialog

```typescript
// 지상 층수: "지상 [ 10 ] 층" Input (숫자 입력, 0 이상)
// 지하 층수: "지하 [ 2 ] 층" Input (숫자 입력, 0 이상 — 백엔드에서 음수 변환)
// useMutation + invalidateQueries 패턴 (nextjs-guide 참조)

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@spotcare/ui'
import { useCreateWorkspace } from '@/domain/workspace'

export function WorkspaceFormDialog() {
    const { mutate, isPending } = useCreateWorkspace()
    // ...
    return (
        <Dialog>
            <DialogTrigger asChild><Button>워크스페이스 추가</Button></DialogTrigger>
            <DialogContent>
                {/* Form */}
                <Button disabled={isPending}>{isPending ? '저장 중...' : '저장'}</Button>
            </DialogContent>
        </Dialog>
    )
}
```

## 층수 Select 드롭다운 패턴

```typescript
import { generateFloorOptions } from '@spotcare/database'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@spotcare/ui'

const floorOptions = generateFloorOptions(workspace.max_floor, workspace.min_floor)

<Select onValueChange={(val) => field.onChange(Number(val))}>
    <SelectTrigger><SelectValue placeholder="층 선택" /></SelectTrigger>
    <SelectContent>
        {floorOptions.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
        ))}
    </SelectContent>
</Select>
// 직접 숫자 Input 금지 — 오입력 방지
```

## 시설 정보 Table

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spotcare/ui'
import { floorToDisplay } from '@spotcare/database'

// 컬럼: 시설명 | 층수(표시용) | 시설 타입 | 위치 설명 | 비고 | 액션
// floor: DB에서 정수로 가져와 floorToDisplay()로 변환하여 표시
```

## 시설 정보 등록 폼 필드

| 필드 | 컴포넌트 | 입력 방식 |
|------|---------|---------|
| 시설명 | `Input` | 자유 텍스트 |
| 층 수 | `Select` | `generateFloorOptions()` 드롭다운 |
| 시설 타입 | `Select` | `useFacilityTypes(workspaceId)` 훅 |
| 위치 설명 | `Textarea` | 자유 텍스트 (선택) |
| 비고 | `Textarea` | 자유 텍스트 (선택) |

## 회원가입 폼

```typescript
// app/(auth)/signup/page.tsx
// 필드: 업체명(company_name), 관리자명(admin_name), 전화번호(phone), 이메일(email), 비밀번호(password)
// 인증 폼은 React Query 불필요 — react-hook-form + signUpAction 직접 호출
import { Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@spotcare/ui'
import { signUpAction } from '@/domain/auth'
```

## 체크리스트

- [ ] UI 컴포넌트를 `@spotcare/ui`에서 import
- [ ] Client Component에서 서버 데이터는 도메인 React Query 훅만 사용
- [ ] 리스트/상세 페이지는 Server Component에서 prefetch + HydrationBoundary
- [ ] 층수 입력은 항상 `Select` + `generateFloorOptions()` (직접 Input 금지)
- [ ] `floorToDisplay()`로 Table에 층수 표시
- [ ] 폼은 react-hook-form + zod 검증
- [ ] 변경 작업은 useMutation + invalidateQueries 패턴
- [ ] `md` 이상 화면에 Table 최적화
