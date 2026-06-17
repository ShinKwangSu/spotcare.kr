// =============================================================================
// stats 도메인 — 대시보드 통계 DTO
// =============================================================================

/**
 * 대시보드 운영 통계.
 * - adminCount: 슈퍼어드민 계정 수
 * - tenantCount: 전체 테넌트(업체) 수
 * - facilityCount: 전체 시설 수
 * - workspaceCount: 전체 워크스페이스 수
 */
export type DashboardStatsDto = {
  adminCount: number
  tenantCount: number
  facilityCount: number
  workspaceCount: number
}
