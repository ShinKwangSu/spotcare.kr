// =============================================================================
// admin 도메인 — mapper (DB Row → 도메인 DTO)
// =============================================================================
//
// password_hash 노출 금지: AdminWithSecret 이 들어와도 password_hash 는 절대
// 매핑 결과에 포함하지 않는다. (Admin 은 이미 해시가 없는 공개 타입이지만,
// 서버 전용 AdminWithSecret 가 흘러들어와도 안전하도록 명시적으로 분해한다.)
// =============================================================================

import type { Admin, AdminWithSecret } from '@spotcare/database'
import type { AdminDto } from '../types'

/**
 * Admin / AdminWithSecret Row → AdminDto 변환.
 * password_hash 는 매핑 대상에서 명시적으로 제외한다.
 */
export function toAdminDto(row: Admin | AdminWithSecret): AdminDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    // password_hash 절대 포함하지 않음
  }
}
