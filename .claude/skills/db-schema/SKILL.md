---
name: db-schema
description: spotcare.kr MVP Supabase 스키마 설계 가이드. tenants/workspaces/facility_types/facilities 테이블 DDL, RLS 정책, TypeScript 타입 생성. DB Architect 에이전트가 스키마 설계 작업 시 반드시 이 스킬을 사용한다. '스키마', '테이블 설계', 'RLS', '마이그레이션' 요청 시 트리거.
---

# DB Schema — spotcare.kr MVP

## 산출물 경로 (모노레포 루트 기준)

| 산출물 | 경로 |
|-------|------|
| 마이그레이션 SQL | `supabase/migrations/NNN_*.sql` |
| TypeScript 타입 | `packages/database/src/types/database.ts` |
| 에이전트 간 요약 | `_workspace/01_db_schema.md` |

> `packages/database/src/types/database.ts`는 `apps/app`과 `apps/admin` 양쪽이 `@spotcare/database`로 import한다.

## 테이블 구조

### tenants (마스터 계정/업체 — apps/app 사용자)
```sql
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  VARCHAR(255) NOT NULL,
  admin_name    VARCHAR(100) NOT NULL,
  phone         VARCHAR(20),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### workspaces (건물/장소)
```sql
CREATE TABLE workspaces (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_name VARCHAR(255) NOT NULL,
  max_floor      INT NOT NULL DEFAULT 0,  -- 지상 최고 층수 (양수, 없으면 0)
  min_floor      INT NOT NULL DEFAULT 0,  -- 지하 최저 층수 (음수, 없으면 0)
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### facility_types (시설 타입/공간 카테고리)
```sql
CREATE TABLE facility_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type_name    VARCHAR(100) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### facilities (시설 정보)
```sql
CREATE TABLE facilities (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_type_id     UUID NOT NULL REFERENCES facility_types(id),
  facility_name        VARCHAR(255) NOT NULL,
  floor                INT NOT NULL,           -- 정수 저장 (3층=3, 지하1층=-1)
  location_description TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

## 층수 저장 규칙

- 지상 층수: 양수 그대로 저장 (`지상 3층` → `3`)
- 지하 층수: 음수로 저장 (`지하 1층` → `-1`)
- 층이 없으면: `0`
- UI 표시 변환은 애플리케이션 레이어에서 담당 (DB에 저장하지 않음)

## RLS 정책

모든 테이블에 RLS를 활성화하고 tenant_id 기반으로 격리한다.

```sql
-- workspaces RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_workspaces"
ON workspaces
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- facility_types RLS (동일 패턴)
ALTER TABLE facility_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_facility_types"
ON facility_types
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- facilities RLS (동일 패턴)
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_facilities"
ON facilities
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

> RLS 대신 Server Action에서 `tenant_id` WHERE 조건으로 직접 격리하는 방식도 가능하다. 두 방법 모두 적용하면 이중 안전장치가 된다.

## TypeScript 타입 (`packages/database/src/types/database.ts`)

```typescript
export type Tenant = {
  id: string
  company_name: string
  admin_name: string
  phone: string | null
  email: string
  created_at: string
}

export type Workspace = {
  id: string
  tenant_id: string
  workspace_name: string
  max_floor: number
  min_floor: number
  created_at: string
}

export type FacilityType = {
  id: string
  workspace_id: string
  tenant_id: string
  type_name: string
  created_at: string
}

export type Facility = {
  id: string
  workspace_id: string
  tenant_id: string
  facility_type_id: string
  facility_name: string
  floor: number
  location_description: string | null
  notes: string | null
  created_at: string
}
```

## 체크리스트

- [ ] 모든 테이블에 UUID PK 사용
- [ ] workspaces, facility_types, facilities에 tenant_id FK 포함
- [ ] RLS 정책 또는 Server Action 레벨 tenant_id 필터 적용
- [ ] min_floor는 음수로 저장 (지하 2층 → `-2`)
- [ ] TypeScript 타입이 `packages/database/src/types/database.ts`에 생성됨
- [ ] TypeScript 타입이 DB 스키마와 동기화됨
