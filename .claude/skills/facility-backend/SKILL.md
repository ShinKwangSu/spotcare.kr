---
name: facility-backend
description: spotcare.kr apps/app 시설 관리 도메인 백엔드 구현 가이드. workspace/facility-type/facility 도메인의 레이어드 아키텍처, 멀티테넌트 격리 패턴. Backend Engineer 에이전트가 apps/app 백엔드 구현 시 반드시 이 스킬을 사용한다.
---

# Facility Backend — apps/app 도메인 구현

> 아키텍처 패턴(레이어 구조, repository 주입, ActionResult, React Query)은 `nextjs-guide` 스킬을 참조한다.

## 대상 앱 및 도메인 구조

**타겟 앱:** `apps/app`

```
apps/app/domain/
├── workspace/
│   ├── index.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── entity.ts          — Workspace 엔티티
│   │   └── dto.ts             — CreateWorkspaceDto, UpdateWorkspaceDto
│   ├── queries/
│   │   ├── index.ts
│   │   ├── workspace.query-keys.ts
│   │   ├── workspace.query-options.ts
│   │   └── workspace.prefetch.ts
│   ├── hooks/
│   │   ├── index.ts
│   │   └── workspace.hooks.ts
│   ├── actions/
│   │   └── workspace.actions.ts   — 'use server'
│   ├── service/
│   │   └── workspace.service.ts
│   ├── repository/
│   │   └── workspace.repository.ts
│   └── mapper/
│       └── workspace.mapper.ts
├── facility-type/              — 동일 구조
└── facility/                  — 동일 구조
```

## Import 규칙

```typescript
// Supabase 서버 클라이언트 — action 레이어에서만 생성
import { createServerSupabase } from '@spotcare/database'

// 층수 변환 유틸
import { floorToDisplay, generateFloorOptions } from '@spotcare/database'

// 앱 내부 인증
import { auth } from '@/auth'
```

## 비즈니스 규칙 — tenant_id 격리

**모든 데이터 접근에 `tenant_id` 필터 필수.** repository 레이어에서 적용한다.

```typescript
// workspace.repository.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export const workspaceRepository = {
    async findAll(supabase: SupabaseClient, tenantId: string) {
        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('tenant_id', tenantId)   // tenant_id 필터 필수
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    async create(supabase: SupabaseClient, tenantId: string, dto: CreateWorkspaceDto) {
        const { data, error } = await supabase
            .from('workspaces')
            .insert({ tenant_id: tenantId, ...dto })
            .select()
            .single()
        if (error) throw error
        return data
    },
}
```

## action 레이어 패턴

```typescript
// workspace.actions.ts
'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { createServerSupabase } from '@spotcare/database'
import { workspaceService } from '../service/workspace.service'

const createWorkspaceSchema = z.object({
    workspace_name: z.string().min(1),
    max_floor: z.coerce.number().int().min(0),
    min_floor: z.coerce.number().int().max(0),
})

export async function getWorkspacesAction() {
    const session = await auth()
    if (!session?.user) throw new Error('Unauthorized')
    const tenantId = (session.user as any).tenantId
    const supabase = createServerSupabase()
    return workspaceService.findAll(supabase, tenantId)
}

export async function createWorkspaceAction(formData: FormData): Promise<ActionResult> {
    const session = await auth()
    if (!session?.user) return { success: false, error: '로그인이 필요합니다.' }
    const tenantId = (session.user as any).tenantId

    const parsed = createWorkspaceSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { success: false, error: '입력값을 확인해주세요.' }

    const { workspace_name, max_floor, min_floor } = parsed.data
    // min_floor: UI 입력은 양수, DB 저장은 음수
    const minFloorValue = min_floor > 0 ? -min_floor : min_floor

    try {
        const supabase = createServerSupabase()
        await workspaceService.create(supabase, tenantId, { workspace_name, max_floor, min_floor: minFloorValue })
        revalidatePath('/dashboard/workspaces')
        return { success: true, data: undefined }
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : '워크스페이스 생성 중 오류가 발생했습니다.' }
    }
}
```

## 층수 변환 규칙

`@spotcare/database`에서 import. 직접 구현 금지.

```typescript
// 양수 n → `${n}F`  예: 3 → "3F"
// 음수 n → `B${Math.abs(n)}`  예: -1 → "B1"
// generateFloorOptions(max=3, min=-1) → [{ value: 3, label: "3F" }, ..., { value: -1, label: "B1" }]
```

## 시설 타입 도메인 (`facility-type/`)

동일 레이어 구조. **이중 필터 필수:** `workspace_id AND tenant_id` 모두 WHERE 조건에 포함.

```typescript
// facility-type.repository.ts
async findAll(supabase, tenantId: string, workspaceId: string) {
    const { data, error } = await supabase
        .from('facility_types')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('tenant_id', tenantId)  // 이중 필터로 격리 보장
    if (error) throw error
    return data
}
```

## 시설 정보 도메인 (`facility/`)

동일 레이어 구조. `floor` 값은 UI의 Select에서 정수로 전달됨 (역변환 불필요).

```typescript
const createFacilitySchema = z.object({
    facility_name: z.string().min(1),
    floor: z.coerce.number().int(),              // 정수 그대로 저장
    facility_type_id: z.string().uuid(),
    location_description: z.string().optional(),
    notes: z.string().optional(),
})
```

## 체크리스트

- [ ] 도메인별 레이어드 구조(`nextjs-guide` 참조) 준수
- [ ] repository가 Supabase 클라이언트를 주입받음 (직접 생성 금지)
- [ ] 모든 repository 메서드에 `tenant_id` 필터 포함
- [ ] `facility_types`, `facilities`에 `workspace_id AND tenant_id` 이중 필터
- [ ] 변경 Action은 ActionResult 반환, 조회 Action은 throw
- [ ] 층수 유틸을 `@spotcare/database`에서 import
- [ ] `min_floor` UI 입력(양수) → DB 저장(음수) 변환 처리
- [ ] Zod로 모든 입력 검증
