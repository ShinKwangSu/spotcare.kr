// =============================================================================
// tenant 도메인 — 엔티티 / DTO 타입
// =============================================================================
//
// DB Row(TenantWithSecret, password_hash 포함)와 구분되는 도메인 타입.
// 클라이언트로 내려보내는 형태에는 password_hash 가 절대 포함되지 않는다.
// =============================================================================

/** 테넌트 단건 DTO (password_hash 제외) */
export type TenantDto = {
  id: string
  companyName: string
  adminName: string
  phone: string
  email: string
  createdAt: string
}

/** 테넌트 상세에 포함되는 워크스페이스 요약 */
export type WorkspaceSummaryDto = {
  id: string
  workspaceName: string
  maxFloor: number
  minFloor: number
  createdAt: string
}

/** 테넌트 상세 DTO (기본 정보 + 워크스페이스 목록) */
export type TenantDetailDto = TenantDto & {
  workspaces: WorkspaceSummaryDto[]
}

/** 테넌트 목록 DTO (페이지네이션 메타 포함) */
export type TenantListDto = {
  tenants: TenantDto[]
  total: number
  page: number
  pageSize: number
}
