// =============================================================================
// spotcare.kr Admin — requireAdmin() 인증 헬퍼
// =============================================================================
//
// Server Action / 데이터 접근 레이어 진입부에서 슈퍼어드민 인증을 강제한다.
// 미인증 시 throw 하여 즉시 차단한다.
//
// 슈퍼어드민은 테넌트 격리 대상이 아니므로 tenant_id 필터를 적용하지 않는다.
// (전역 데이터 접근이 의도된 설계)
// =============================================================================

import { auth } from '@/auth'

/**
 * 슈퍼어드민 인증 강제. 미인증 시 throw.
 * 반환된 adminId 는 admins.id(UUID) 이다.
 */
export async function requireAdmin(): Promise<{ adminId: string }> {
  const session = await auth()
  if (!session?.user?.adminId) {
    throw new Error('Unauthorized')
  }
  return { adminId: session.user.adminId }
}
