---
name: nextjs-guide
description: >
    Next.js App Router + React Query 프로젝트의 아키텍처 가이드.
    Next.js, React Query, TanStack Query, nuqs, App Router, Server Component, Client Component,
    prefetch, query options, query keys, mutation, invalidation, Suspense, Lighthouse 관련 작업 시 참조.
    컴포넌트 구조, 도메인 디렉토리 설계, 캐시 전략, 에러 핸들링, URL 관리 패턴 포함.
    새 도메인 scaffold, React Query 훅 작성, Server Action 구현, prefetch 설정 등 Next.js 작업 전 확인.
    backend-engineer, ui-engineer가 구현 전 반드시 이 스킬을 읽는다.
---

# Next.js + React Query 아키텍처 가이드

> 스택: Next.js App Router + TanStack React Query + TypeScript + Tailwind + nuqs + Supabase
> 목표: Lighthouse ≥ 90
> 적용 범위: `apps/app`, `apps/admin` 모두 동일한 아키텍처를 사용한다.

---

## 1. 아키텍처 원칙

- 도메인 기반 디렉토리 구조 (필수)
- Server Component 기본
- Client Component는 최소화, 명시적으로만
- 서버 데이터 상태는 React Query만 관리
- UI 컴포넌트에 데이터 패칭 로직 금지

---

## 2. 도메인 기반 디렉토리 구조

모든 로직은 **도메인**별로 **레이어드 아키텍처**로 구성한다.

### 2.1 디렉토리 구조

```
{target_app}/domain/
  {domain-name}/
    ├── index.ts                 # Public API (전체 re-export)
    ├── types/
    │   ├── index.ts
    │   ├── dto.ts               # 요청/응답 DTO
    │   └── entity.ts            # 도메인 엔티티
    ├── queries/
    │   ├── index.ts
    │   ├── {domain}.query-keys.ts
    │   ├── {domain}.query-options.ts
    │   └── {domain}.prefetch.ts
    ├── hooks/
    │   ├── index.ts
    │   └── {domain}.hooks.ts    # 클라이언트 React Query 훅
    ├── actions/
    │   └── {domain}.actions.ts  # Server Actions ('use server')
    ├── service/
    │   └── {domain}.service.ts
    ├── repository/
    │   └── {domain}.repository.ts
    └── mapper/
        └── {domain}.mapper.ts   # Row → entity 변환
```

### 2.2 레이어 책임

| 레이어 | 역할 | 의존성 |
|--------|------|--------|
| **types** | 타입 정의 (생성된 Supabase 타입 → 도메인 타입) | 없음 |
| **queries** | Query Keys, Options, Prefetch | types |
| **hooks** | 클라이언트 React Query 훅 | queries |
| **actions** | Server Actions (진입점) | service |
| **service** | 비즈니스 로직 | repository, mapper |
| **repository** | 데이터 접근 (Supabase client). Supabase row 타입 외부 노출 ❌ | mapper, types |
| **mapper** | Supabase row 타입 → 도메인 entity 변환 | types |

### 2.3 index.ts 규칙

| 디렉토리 | index.ts | 이유 |
|----------|----------|------|
| **루트** | ✅ 필수 | 도메인 public API |
| **types** | ✅ 필수 | 외부에서 타입 import |
| **queries** | ✅ 필수 | queryKeys, options, prefetch |
| **hooks** | ✅ 필수 | 외부에서 hooks import |
| **actions** | ❌ 불필요 | 루트에서 직접 export |
| **service** | ❌ 불필요 | 내부에서만 사용 |
| **repository** | ❌ 불필요 | 내부에서만 사용 |
| **mapper** | ❌ 불필요 | 내부에서만 사용 |

### 2.4 import 규칙

- 하나의 도메인 = 하나의 책임
- 크로스 도메인 deep import 금지
    - ❌ `@/domain/workspace/queries/workspace.query-options`
    - ✅ `@/domain/workspace`

---

## 3. Supabase 클라이언트 규칙

Supabase는 실행 환경별로 클라이언트를 **반드시 분리**한다.

| 클라이언트 | 생성 함수 | 용도 |
|-----------|-----------|------|
| **Server** | `@spotcare/database`의 server client | RSC, Server Action, Route Handler |
| **Browser** | `@spotcare/database`의 browser client | Client Component 전용 |

규칙:
- 서버 클라이언트는 **요청 단위로 생성**한다. 모듈 전역 싱글톤 금지 (세션/쿠키 오염).
- repository 레이어는 클라이언트를 **인자로 주입받는다**. 내부에서 직접 생성 금지.
- `SERVICE_ROLE` 키는 서버 전용. 클라이언트 번들 노출 절대 금지.

```ts
// repository는 클라이언트를 주입받는다
export const workspaceRepository = {
    async findList(supabase: SupabaseClient, tenantId: string) {
        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('tenant_id', tenantId)
        if (error) throw error
        return data
    },
}

// action에서 클라이언트를 생성해 service로 전달
import { createServerSupabase } from '@spotcare/database'

export async function getWorkspacesAction() {
    const supabase = createServerSupabase()
    return workspaceService.findList(supabase, tenantId)
}
```

---

## 4. React Query 전략

### 4.1 Query Keys (엄격)

- query key는 반드시 배열
- 인라인 query key 절대 금지
- params는 단일 객체로
- 네이밍: `['도메인', '범위', params?]`

```ts
// {domain}.query-keys.ts
export const workspaceQueryKeys = {
    all: ['workspace'] as const,
    list: () => [...workspaceQueryKeys.all, 'list'] as const,
    detail: (id: string) => [...workspaceQueryKeys.all, 'detail', id] as const,
}
```

### 4.2 Query Options (필수)

- 모든 쿼리는 반드시 공유 query option 팩토리 사용
- 인라인 `useQuery({ ... })` 금지

```ts
// {domain}.query-options.ts
export const workspaceQueryOptions = {
    list: () => ({
        queryKey: workspaceQueryKeys.list(),
        queryFn: () => getWorkspacesAction(),
    }),
    detail: (id: string) => ({
        queryKey: workspaceQueryKeys.detail(id),
        queryFn: () => getWorkspaceAction(id),
        staleTime: 5 * 60_000,
    }),
}
```

### 4.3 Client Hooks

```ts
// {domain}.hooks.ts
export function useWorkspaces() {
    return useQuery(workspaceQueryOptions.list())
}

export function useWorkspace(id: string) {
    return useQuery(workspaceQueryOptions.detail(id))
}
```

---

## 5. Prefetch 전략

### 언제 Prefetch 할까

- ✅ 필수: 리스트 페이지 (SEO, LCP), 상세 페이지
- ⚠️ 선택: 보조 탭, 비중요 연관 데이터
- ❌ 금지: 무한 스크롤 다음 페이지, 사용자별 개인화 데이터, 모달 전용 데이터

### runPrefetch 유틸리티

```ts
// lib/react-query/prefetch.ts
export async function runPrefetch(
    ...prefetchers: Array<(qc: QueryClient) => Promise<void>>
) {
    const qc = getQueryClient()
    await Promise.all(prefetchers.map(fn => fn(qc)))
    return dehydrate(qc)
}
```

### 도메인 Prefetch 패턴

```ts
// {domain}.prefetch.ts
export const workspacePrefetch = {
    list() {
        return async (queryClient: QueryClient) => {
            await queryClient.prefetchQuery(workspaceQueryOptions.list())
        }
    },
}
```

### 페이지에서 사용 (Server Component)

```ts
// 병렬 prefetch
const state = await runPrefetch(
    workspacePrefetch.list(),
    facilityTypePrefetch.list(workspaceId),
)
return <HydrationBoundary state={state}><PageContent /></HydrationBoundary>
```

---

## 6. 캐시 레이어 규칙

| 레이어 | 역할 |
|--------|------|
| **L0** – Next fetch cache | ISR, revalidateTag. 클라이언트 freshness 용도 ❌ |
| **L1** – React cache() | 단일 RSC 렌더 내 중복 fetch 제거. Supabase 서버 클라이언트도 요청 단위 캐싱. |
| **L2** – React Query cache | UI state 단일 출처. 모든 UI는 여기서만 읽는다. |

```ts
// @spotcare/database 내부 또는 앱에서 — 요청 단위 캐싱
import { cache } from 'react'
export const getServerSupabase = cache(() => createServerSupabase())
```

---

## 7. Mutation & Invalidation

흐름: `Server Action → Supabase 변경 → invalidateQueries → UI refetch`

- mutation 후 UI state 직접 변경 금지
- query key 팩토리를 통한 invalidate만 허용
- `router.refresh()`를 주 업데이트 수단으로 사용 ❌
- Supabase는 에러를 throw하지 않고 `{ data, error }`로 반환 → repository에서 `error` 확인 후 throw

```ts
// Client Component에서 mutation
const queryClient = useQueryClient()
const { mutate } = useMutation({
    mutationFn: (data) => createWorkspaceAction(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all }),
})
```

---

## 8. 에러 처리 전략

### ActionResult 패턴 (변경 Server Action 전용)

```ts
type ActionResult<T = void> =
    | { success: true; data: T }
    | { success: false; error: string }
```

- **조회 Action**: `throw` → React Query가 error state 처리
- **변경 Action**: `ActionResult` 패턴으로 반환
- **인증 에러**: `throw new Error('로그인이 필요합니다.')` 즉시 차단
- **비즈니스 에러**: `ActionResult.error`에 사용자 친화 메시지
- 원본 Error/Supabase error 객체 클라이언트 노출 ❌

### Repository 에러 처리

```ts
// repository: 인프라 에러는 throw
async findList(supabase, tenantId) {
    const { data, error } = await supabase.from('workspaces').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data
}

// service: 비즈니스 의미로 변환
async findList(supabase, tenantId) {
    try {
        return await workspaceRepository.findList(supabase, tenantId)
    } catch {
        throw new Error('워크스페이스 목록을 불러오는 중 오류가 발생했습니다.')
    }
}

// action: ActionResult로 래핑 (변경 작업)
export async function createWorkspaceAction(data): Promise<ActionResult> {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: '로그인이 필요합니다.' }
        const supabase = getServerSupabase()
        await workspaceService.create(supabase, data)
        revalidatePath('/dashboard/workspaces')
        return { success: true, data: undefined }
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : '오류가 발생했습니다.' }
    }
}
```

---

## 9. 서버 / 클라이언트 경계

**서버(Server Component):** prefetch + SEO 중요 데이터. React Query 훅 사용 ❌.

**클라이언트(Client Component):** 공유 queryOptions만 사용. UI 컴포넌트에 데이터 패칭 로직 ❌. `useEffect`에서 데이터 패칭 절대 금지.

---

## 10. Suspense & 스트리밍 정책

레이아웃 안정성에 영향을 주는 비동기 경계에만 Suspense 사용.

- ✅ 메인 콘텐츠 블록, 라우트 레벨 데이터 섹션
- ❌ 작은 UI 조각, 사용자 트리거 refetch, 페이지네이션 로딩

스켈레톤 규칙: 최종 레이아웃 크기와 일치해야 함 (CLS 방지)

---

## 11. URL & 쿼리 스트링

- `nuqs`만 사용 (직접 `useSearchParams` 사용 금지)
- `null` → query param 제거
- enum 기본값 명시 필수
- query param은 query key와 1:1 대응

---

## 12. 페이지네이션

- 무한 쿼리 prefetch 금지
- 페이지 인덱스는 query key에 포함
- 필터 변경 시 page를 1로 리셋
- Supabase는 `.range(from, to)` + `select('*', { count: 'exact' })`

---

## 13. 성능 가드레일 (Lighthouse ≥ 90)

금지:
- `useEffect`에서 데이터 패칭
- 자주 렌더되는 컴포넌트 내부의 dynamic import
- Client Component에 non-memoized array/object props

필수:
- Server Components 우선
- hydration payload 최소화
- 불필요한 client providers 제거
