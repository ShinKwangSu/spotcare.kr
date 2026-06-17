// =============================================================================
// tenant 도메인 — mapper (DB Row → 도메인 DTO)
// =============================================================================
//
// password_hash 노출 금지: Tenant Row 에 password_hash 가 흘러들어와도 매핑
// 결과에 포함하지 않는다(명시적 필드 분해).
// =============================================================================

import type { Tenant, Workspace } from '@spotcare/database'
import type {
  TenantDto,
  TenantDetailDto,
  WorkspaceSummaryDto,
} from '../types'

/** Tenant Row(password_hash 가 섞여 있어도) → TenantDto */
export function toTenantDto(row: Tenant): TenantDto {
  return {
    id: row.id,
    companyName: row.company_name,
    adminName: row.admin_name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    // password_hash 절대 포함하지 않음
  }
}

/** Workspace Row → WorkspaceSummaryDto */
export function toWorkspaceSummaryDto(row: Workspace): WorkspaceSummaryDto {
  return {
    id: row.id,
    workspaceName: row.workspace_name,
    maxFloor: row.max_floor,
    minFloor: row.min_floor,
    createdAt: row.created_at,
  }
}

/** workspaces 가 조인된 Tenant Row → TenantDetailDto */
export function toTenantDetailDto(
  row: Tenant & { workspaces?: Workspace[] | null }
): TenantDetailDto {
  return {
    ...toTenantDto(row),
    workspaces: (row.workspaces ?? []).map(toWorkspaceSummaryDto),
  }
}
