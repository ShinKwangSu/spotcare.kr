// =============================================================================
// admin 도메인 — 요청 DTO / ActionResult
// =============================================================================

/** 어드민 생성 입력 (비밀번호는 서버에서 임시값으로 발급) */
export type CreateAdminInput = {
  email: string
  name: string
}

/** 어드민 수정 입력 (이름/이메일만 변경 가능) */
export type UpdateAdminInput = {
  email?: string
  name?: string
}

/** 어드민 목록 조회 파라미터 */
export type AdminListParams = {
  page: number
  pageSize: number
}

/**
 * 변경 Server Action 의 표준 반환 형태.
 * 조회 Action 은 throw 로 처리하고 이 타입을 사용하지 않는다.
 */
export type AdminActionResult<T = void> = {
  success: boolean
  data?: T
  error?: string
}
