// =============================================================================
// tenant 도메인 — repository (DB 접근)
// =============================================================================
//
// 규칙:
// - Supabase 클라이언트를 인자로 주입받는다. 내부에서 직접 생성하지 않는다.
// - 슈퍼어드민은 전역 권한이므로 tenant_id 필터를 적용하지 않는다(의도된 설계).
// - tenants.Row 는 TenantWithSecret(해시 포함)이므로 명시적 컬럼 지정으로
//   password_hash 누출을 차단한다.
// - 검색: company_name + email ILIKE.
// - 인프라 에러는 throw 한다(service 에서 비즈니스 의미로 변환).
// =============================================================================

import type { Tenant, Workspace, TypedSupabaseClient } from '@spotcare/database'

type Db = TypedSupabaseClient

// password_hash 를 제외한 공개 컬럼만 선택한다.
const PUBLIC_COLUMNS = 'id, company_name, admin_name, phone, email, created_at'

/** 검색어를 ILIKE 패턴으로 안전하게 변환 (콤마/괄호는 .or() 구문 충돌 방지) */
function sanitizeSearch(search: string): string {
  return search.replace(/[,()%]/g, ' ').trim()
}

export const tenantRepository = {
  /** 페이지네이션 목록 + 전체 카운트 (검색 옵션) */
  async findAll(
    supabase: Db,
    params: { page: number; pageSize: number; search?: string }
  ): Promise<{ tenants: Tenant[]; total: number }> {
    const from = (params.page - 1) * params.pageSize
    const to = from + params.pageSize - 1

    let query = supabase
      .from('tenants')
      .select(PUBLIC_COLUMNS, { count: 'exact' })

    const search = params.search ? sanitizeSearch(params.search) : ''
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error
    return { tenants: (data ?? []) as Tenant[], total: count ?? 0 }
  },

  /** 단건 상세 — 워크스페이스 요약 조인 (password_hash 제외) */
  async findById(
    supabase: Db,
    tenantId: string
  ): Promise<(Tenant & { workspaces: Workspace[] }) | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select(
        `${PUBLIC_COLUMNS}, workspaces(id, tenant_id, workspace_name, max_floor, min_floor, created_at)`
      )
      .eq('id', tenantId)
      .maybeSingle()

    if (error) throw error
    return (data as (Tenant & { workspaces: Workspace[] }) | null) ?? null
  },

  /** 수정 (업체명/관리자명/전화번호) — 변경 후 공개 컬럼만 반환 */
  async update(
    supabase: Db,
    tenantId: string,
    input: { company_name?: string; admin_name?: string; phone?: string }
  ): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update(input)
      .eq('id', tenantId)
      .select(PUBLIC_COLUMNS)
      .single()

    if (error) throw error
    return data as Tenant
  },

  /** 삭제 (연관 데이터는 DB FK CASCADE 로 정리) */
  async delete(supabase: Db, tenantId: string): Promise<void> {
    const { error } = await supabase.from('tenants').delete().eq('id', tenantId)
    if (error) throw error
  },

  /** 전체 카운트 (대시보드용) */
  async count(supabase: Db): Promise<number> {
    const { count, error } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })

    if (error) throw error
    return count ?? 0
  },
}
