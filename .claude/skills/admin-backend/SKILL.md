---
name: admin-backend
description: spotcare.kr apps/admin 슈퍼어드민 Server Actions 구현 가이드. 테넌트 목록/상세 조회, 워크스페이스 현황, 사용자 관리 등 운영 데이터 CRUD. Backend Engineer 에이전트가 apps/admin Server Action 구현 시 반드시 이 스킬을 사용한다.
---

# Admin Backend — apps/admin Server Actions

## 대상 앱 및 파일 경로

**타겟 앱:** `apps/admin`

```
apps/admin/
├── app/
│   └── actions/
│       ├── auth.ts       — 로그인/로그아웃 (admin-auth-setup 스킬 참조)
│       ├── tenant.ts     — 테넌트 조회/관리
│       └── stats.ts      — 운영 통계 (워크스페이스 수, 시설 수 등)
└── lib/
    └── validations/
        └── tenant.ts
```

## Import 규칙

```typescript
// Supabase 클라이언트 — @spotcare/database에서 import
import { createClient } from '@spotcare/database'

// 앱 내부 인증 — @/ alias 사용
import { auth } from '@/auth'
```

## 공통 패턴 — 어드민 권한 확인

**슈퍼어드민은 모든 테넌트 데이터에 접근한다. tenant_id 필터 없음.**

```typescript
'use server'
import { auth } from '@/auth'
import { createClient } from '@spotcare/database'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || !(session.user as any).adminId) {
    throw new Error('Unauthorized')
  }
  return (session.user as any).adminId
}
```

## 테넌트 관리 Server Actions (`app/actions/tenant.ts`)

```typescript
'use server'
import { auth } from '@/auth'
import { createClient } from '@spotcare/database'

// 전체 테넌트 목록 조회 (페이지네이션 지원)
export async function getTenants(page = 1, pageSize = 20) {
  await requireAdmin()

  const supabase = createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count } = await supabase
    .from('tenants')
    .select('id, company_name, admin_name, email, phone, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  return { data: data ?? [], total: count ?? 0 }
}

// 특정 테넌트 상세 조회 (워크스페이스 포함)
export async function getTenantDetail(tenantId: string) {
  await requireAdmin()

  const supabase = createClient()
  const { data } = await supabase
    .from('tenants')
    .select(`
      *,
      workspaces (
        id,
        workspace_name,
        max_floor,
        min_floor,
        created_at
      )
    `)
    .eq('id', tenantId)
    .single()

  return data
}

// 테넌트 비활성화/삭제 — 운영 정책에 따라 구현
export async function deleteTenant(tenantId: string) {
  await requireAdmin()

  const supabase = createClient()
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)

  if (error) return { success: false, error: '테넌트 삭제 중 오류가 발생했습니다.' }
  return { success: true }
}
```

## 운영 통계 Server Actions (`app/actions/stats.ts`)

```typescript
'use server'
import { createClient } from '@spotcare/database'

export async function getServiceStats() {
  await requireAdmin()

  const supabase = createClient()
  const [tenants, workspaces, facilities] = await Promise.all([
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('workspaces').select('id', { count: 'exact', head: true }),
    supabase.from('facilities').select('id', { count: 'exact', head: true }),
  ])

  return {
    tenantCount: tenants.count ?? 0,
    workspaceCount: workspaces.count ?? 0,
    facilityCount: facilities.count ?? 0,
  }
}
```

## 체크리스트

- [ ] 모든 Server Action에서 `requireAdmin()` 호출
- [ ] 슈퍼어드민은 tenant_id 필터 없이 전체 데이터 접근
- [ ] Supabase 클라이언트를 `@spotcare/database`에서 import
- [ ] Zod로 모든 입력 검증
- [ ] 성공/실패 일관된 반환 타입 `{ success: boolean, data?, error? }`
- [ ] 페이지네이션이 필요한 목록 API에 range 적용
