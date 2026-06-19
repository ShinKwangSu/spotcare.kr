'use server'

// =============================================================================
// spotcare.kr MVP — 시설 타입 CRUD Server Actions
// =============================================================================
//
// 격리 패턴: 모든 쿼리에 tenant_id 와 workspace_id 를 함께 필터한다(이중 격리).
//
// 소프트 딜리트: .delete() 대신 deleted_at = NOW() 업데이트.
//   - 모든 SELECT 에 .is('deleted_at', null) 필터 추가.
//   - 사용 중 여부 확인 시 삭제된 시설은 카운트에서 제외.
//
// 제약:
//   - DB UNIQUE(workspace_id, type_name) → 중복 시 23505 처리.
//   - 삭제된 시설(.is('deleted_at', null))이 없어야 삭제 가능.
//
// 반환 타입 규약: { success: true, data? } | { success: false, error }
// =============================================================================

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { facilityTypeSchema } from '@/lib/validations/facility-type'
import type { FacilityType } from '@/types/database'
import type { ActionResult } from '@/app/actions/workspace'

async function getTenantId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.tenantId ?? null
}

function facilityTypesPath(workspaceId: string): string {
  return `/dashboard/${workspaceId}/facility-types`
}

async function assertWorkspaceOwned(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  tenantId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()
  return !!data
}

// -----------------------------------------------------------------------------
// 조회
// -----------------------------------------------------------------------------

export async function getFacilityTypes(workspaceId: string): Promise<FacilityType[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('facility_types')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

// -----------------------------------------------------------------------------
// 생성
// -----------------------------------------------------------------------------

export async function createFacilityType(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<FacilityType>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const parsed = facilityTypeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'
    return { success: false, error: first }
  }

  const supabase = createClient()

  if (!(await assertWorkspaceOwned(supabase, workspaceId, tenantId))) {
    return { success: false, error: '워크스페이스를 찾을 수 없습니다.' }
  }

  const { data, error } = await supabase
    .from('facility_types')
    .insert({ tenant_id: tenantId, workspace_id: workspaceId, type_name: parsed.data.type_name })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: '이미 존재하는 타입 이름입니다.' }
    }
    return { success: false, error: '시설 타입 생성 중 오류가 발생했습니다.' }
  }

  revalidatePath(facilityTypesPath(workspaceId))
  return { success: true, data }
}

// -----------------------------------------------------------------------------
// 수정
// -----------------------------------------------------------------------------

export async function updateFacilityType(
  id: string,
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<FacilityType>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const parsed = facilityTypeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'
    return { success: false, error: first }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('facility_types')
    .update({ type_name: parsed.data.type_name })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .select()
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: '이미 존재하는 타입 이름입니다.' }
    }
    return { success: false, error: '시설 타입 수정 중 오류가 발생했습니다.' }
  }
  if (!data) return { success: false, error: '시설 타입을 찾을 수 없습니다.' }

  revalidatePath(facilityTypesPath(workspaceId))
  return { success: true, data }
}

// -----------------------------------------------------------------------------
// 삭제 (소프트 딜리트)
// -----------------------------------------------------------------------------

export async function deleteFacilityType(
  id: string,
  workspaceId: string
): Promise<ActionResult> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const supabase = createClient()

  // 활성 시설에서 사용 중인지 확인 (삭제된 시설은 제외)
  const { count, error: countError } = await supabase
    .from('facilities')
    .select('id', { count: 'exact', head: true })
    .eq('facility_type_id', id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (countError) return { success: false, error: '시설 타입 삭제 중 오류가 발생했습니다.' }
  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: '이 타입을 사용하는 시설이 있어 삭제할 수 없습니다. 먼저 시설을 삭제하거나 타입을 변경해주세요.',
    }
  }

  const { error } = await supabase
    .from('facility_types')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (error) return { success: false, error: '시설 타입 삭제 중 오류가 발생했습니다.' }

  revalidatePath(facilityTypesPath(workspaceId))
  return { success: true }
}
