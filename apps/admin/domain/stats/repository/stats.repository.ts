// =============================================================================
// stats 도메인 — repository (카운트 집계)
// =============================================================================
//
// 규칙:
// - Supabase 클라이언트를 인자로 주입받는다.
// - head: true + count: 'exact' 로 행 데이터 없이 카운트만 조회한다.
// - 슈퍼어드민 전역 집계이므로 tenant_id 필터를 적용하지 않는다(의도된 설계).
// =============================================================================

import type { TypedSupabaseClient } from '@spotcare/database'

type Db = TypedSupabaseClient
type CountTable = 'admins' | 'tenants' | 'facilities' | 'workspaces'

export const statsRepository = {
  async count(supabase: Db, table: CountTable): Promise<number> {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (error) throw error
    return count ?? 0
  },
}
