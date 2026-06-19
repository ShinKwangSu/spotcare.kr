// =============================================================================
// admin 도메인 — repository (DB 접근)
// =============================================================================
//
// 규칙:
// - Supabase 클라이언트를 인자로 주입받는다. 내부에서 직접 생성하지 않는다.
// - 슈퍼어드민은 전역 권한이므로 tenant_id 필터를 적용하지 않는다(의도된 설계).
// - 클라이언트로 내려보낼 데이터는 명시적 컬럼 지정으로 password_hash 누출을 차단한다.
//   (단, 비밀번호 검증용 findSecretById 만 password_hash 를 SELECT 한다 — 서버 전용)
// - 인프라 에러는 throw 한다(service 에서 비즈니스 의미로 변환).
// =============================================================================

import type {
  Admin,
  AdminWithSecret,
  AdminInsert,
  AdminUpdate,
  TypedSupabaseClient,
} from '@spotcare/database'

type Db = TypedSupabaseClient

// password_hash 를 제외한 공개 컬럼만 선택한다.
const PUBLIC_COLUMNS = 'id, email, name, created_at'

export const adminRepository = {
  /** 페이지네이션 목록 + 전체 카운트 (password_hash 제외) */
  async findAll(
    supabase: Db,
    params: { page: number; pageSize: number }
  ): Promise<{ admins: Admin[]; total: number }> {
    const from = (params.page - 1) * params.pageSize
    const to = from + params.pageSize - 1

    const { data, count, error } = await supabase
      .from('admins')
      .select(PUBLIC_COLUMNS, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error
    return { admins: (data ?? []) as Admin[], total: count ?? 0 }
  },

  /** 단건 조회 (password_hash 제외) */
  async findById(supabase: Db, id: string): Promise<Admin | null> {
    const { data, error } = await supabase
      .from('admins')
      .select(PUBLIC_COLUMNS)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return (data as Admin | null) ?? null
  },

  /**
   * 비밀번호 검증용 단건 조회 (password_hash 포함, 서버 전용).
   * 절대 클라이언트로 반환하지 않는다.
   */
  async findSecretById(
    supabase: Db,
    id: string
  ): Promise<AdminWithSecret | null> {
    const { data, error } = await supabase
      .from('admins')
      .select('id, email, name, created_at, password_hash')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return (data as AdminWithSecret | null) ?? null
  },

  /** 이메일 중복 확인용 조회 (password_hash 제외) */
  async findByEmail(supabase: Db, email: string): Promise<Admin | null> {
    const { data, error } = await supabase
      .from('admins')
      .select(PUBLIC_COLUMNS)
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return (data as Admin | null) ?? null
  },

  /** 생성 (password_hash 는 service 에서 해싱하여 전달) */
  async create(supabase: Db, input: AdminInsert): Promise<Admin> {
    const { data, error } = await supabase
      .from('admins')
      .insert(input)
      .select(PUBLIC_COLUMNS)
      .single()

    if (error) throw error
    return data as Admin
  },

  /** 수정 (이름/이메일/비밀번호 등) — 변경 후 공개 컬럼만 반환 */
  async update(supabase: Db, id: string, input: AdminUpdate): Promise<Admin> {
    const { data, error } = await supabase
      .from('admins')
      .update(input)
      .eq('id', id)
      .select(PUBLIC_COLUMNS)
      .single()

    if (error) throw error
    return data as Admin
  },

  /** 비밀번호 해시 갱신 (서버 전용 — password_hash 컬럼 변경) */
  async updatePassword(
    supabase: Db,
    id: string,
    passwordHash: string
  ): Promise<void> {
    const { error } = await supabase
      .from('admins')
      .update({ password_hash: passwordHash })
      .eq('id', id)

    if (error) throw error
  },

  /** 소프트 딜리트 */
  async delete(supabase: Db, id: string): Promise<void> {
    const { error } = await supabase
      .from('admins')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    if (error) throw error
  },

  /** 활성 어드민 전체 카운트 (대시보드용) */
  async count(supabase: Db): Promise<number> {
    const { count, error } = await supabase
      .from('admins')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (error) throw error
    return count ?? 0
  },
}
