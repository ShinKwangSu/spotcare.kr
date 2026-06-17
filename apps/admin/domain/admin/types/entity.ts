// =============================================================================
// admin 도메인 — 엔티티 타입
// =============================================================================
//
// DB Row(AdminWithSecret, password_hash 포함)와 구분되는 도메인 엔티티.
// 클라이언트로 내려보내는 형태에는 password_hash 가 절대 포함되지 않는다.
// =============================================================================

/** 어드민 단건 DTO (password_hash 제외) */
export type AdminDto = {
  id: string
  email: string
  name: string
  createdAt: string
}

/** 어드민 목록 DTO (페이지네이션 메타 포함) */
export type AdminListDto = {
  admins: AdminDto[]
  total: number
  page: number
  pageSize: number
}
