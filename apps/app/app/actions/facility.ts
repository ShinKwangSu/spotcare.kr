'use server'

// =============================================================================
// spotcare.kr MVP — 시설 정보 CRUD Server Actions
// =============================================================================
//
// 격리 패턴: 모든 쿼리에 tenant_id 와 workspace_id 를 함께 필터한다.
//   추가로 facility_type_id 가 같은 테넌트/워크스페이스 소속인지 검증한다
//   (타 워크스페이스의 타입으로 시설을 분류하는 것을 차단).
//
// floor: UI Select(generateFloorOptions)에서 정수로 전달된다. 역변환 불필요.
//   지상=양수, 지하=음수, 층 없음=0. 표시 변환은 floorToDisplay(앱 레이어).
//
// 반환 타입 규약: { success: true, data? } | { success: false, error }
// =============================================================================

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { facilitySchema } from '@/lib/validations/facility'
import type { Facility, FacilityWithChecklists } from '@/types/database'
import type { ActionResult } from '@/app/actions/workspace'

async function getTenantId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.tenantId ?? null
}

function facilitiesPath(workspaceId: string): string {
  // UI 라우트 구조와 일치: /dashboard/[workspaceId]/facilities
  return `/dashboard/${workspaceId}/facilities`
}

/**
 * facility_type_id 가 현재 테넌트 + 지정 워크스페이스 소속인지 확인한다.
 * 타 워크스페이스/테넌트의 타입으로 시설을 분류하는 것을 차단한다.
 */
async function assertFloorInRange(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  tenantId: string,
  floor: number
): Promise<boolean> {
  const { data: ws } = await supabase
    .from('workspaces')
    .select('min_floor, max_floor')
    .eq('id', workspaceId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!ws) return false
  if (floor === 0) return false
  return floor >= ws.min_floor && floor <= ws.max_floor
}

async function assertFacilityTypeOwned(
  supabase: ReturnType<typeof createClient>,
  facilityTypeId: string,
  workspaceId: string,
  tenantId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('facility_types')
    .select('id')
    .eq('id', facilityTypeId)
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return !!data
}

// -----------------------------------------------------------------------------
// 조회
// -----------------------------------------------------------------------------

/**
 * 지정 워크스페이스의 시설 목록을 반환한다.
 * 정렬: 층수 내림차순(상층 우선) → 생성순. INT 컬럼으로 SQL 정렬(추가 연산 불필요).
 * tenant_id + workspace_id 이중 필터로 격리를 보장한다.
 */
export async function getFacilities(
  workspaceId: string
): Promise<FacilityWithChecklists[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('facilities')
    .select('*, facility_checklists(checklist_id)')
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .order('floor', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as unknown as FacilityWithChecklists[]
}

/**
 * 단일 시설 조회(수정 폼 프리필용).
 */
export async function getFacility(
  id: string
): Promise<ActionResult<Facility>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) return { success: false, error: '시설 조회 중 오류가 발생했습니다.' }
  if (!data) return { success: false, error: '시설을 찾을 수 없습니다.' }
  return { success: true, data }
}

// -----------------------------------------------------------------------------
// 생성
// -----------------------------------------------------------------------------

/**
 * 시설 생성. workspaceId 는 액션 인자로 전달된다.
 */
export async function createFacility(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<Facility>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const raw = Object.fromEntries(formData)
  const parsed = facilitySchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'
    return { success: false, error: first }
  }

  const { facility_name, floor, facility_type_id, location_description, notes } =
    parsed.data
  const checklistIds: string[] = raw.checklist_ids_json
    ? JSON.parse(raw.checklist_ids_json as string)
    : []

  const supabase = createClient()

  if (!(await assertFloorInRange(supabase, workspaceId, tenantId, floor))) {
    return { success: false, error: '유효하지 않은 층수입니다.' }
  }

  // 선택한 타입이 이 워크스페이스/테넌트 소속인지 검증.
  if (
    !(await assertFacilityTypeOwned(
      supabase,
      facility_type_id,
      workspaceId,
      tenantId
    ))
  ) {
    return { success: false, error: '올바른 시설 타입을 선택해주세요.' }
  }

  const { data, error } = await supabase
    .from('facilities')
    .insert({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      facility_type_id,
      facility_name,
      floor,
      location_description: location_description ?? null,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: '시설 생성 중 오류가 발생했습니다.' }
  }

  if (checklistIds.length > 0) {
    await supabase.from('facility_checklists').insert(
      checklistIds.map((checklistId) => ({
        facility_id: data.id,
        checklist_id: checklistId,
        workspace_id: workspaceId,
        tenant_id: tenantId,
      }))
    )
  }

  revalidatePath(facilitiesPath(workspaceId))
  return { success: true, data }
}

// -----------------------------------------------------------------------------
// 수정
// -----------------------------------------------------------------------------

/**
 * 시설 수정.
 * tenant_id + workspace_id 를 WHERE 에 포함하고, 변경된 타입의 소속도 재검증한다.
 */
export async function updateFacility(
  id: string,
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<Facility>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const raw = Object.fromEntries(formData)
  const parsed = facilitySchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'
    return { success: false, error: first }
  }

  const { facility_name, floor, facility_type_id, location_description, notes } =
    parsed.data
  const checklistIds: string[] = raw.checklist_ids_json
    ? JSON.parse(raw.checklist_ids_json as string)
    : []

  const supabase = createClient()

  if (!(await assertFloorInRange(supabase, workspaceId, tenantId, floor))) {
    return { success: false, error: '유효하지 않은 층수입니다.' }
  }

  if (
    !(await assertFacilityTypeOwned(
      supabase,
      facility_type_id,
      workspaceId,
      tenantId
    ))
  ) {
    return { success: false, error: '올바른 시설 타입을 선택해주세요.' }
  }

  const { data, error } = await supabase
    .from('facilities')
    .update({
      facility_type_id,
      facility_name,
      floor,
      location_description: location_description ?? null,
      notes: notes ?? null,
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .select()
    .maybeSingle()

  if (error) {
    return { success: false, error: '시설 수정 중 오류가 발생했습니다.' }
  }
  if (!data) {
    return { success: false, error: '시설을 찾을 수 없습니다.' }
  }

  // 점검표 연결 전체 교체 (삭제 후 재삽입)
  await supabase
    .from('facility_checklists')
    .delete()
    .eq('facility_id', id)
    .eq('tenant_id', tenantId)

  if (checklistIds.length > 0) {
    await supabase.from('facility_checklists').insert(
      checklistIds.map((checklistId) => ({
        facility_id: id,
        checklist_id: checklistId,
        workspace_id: workspaceId,
        tenant_id: tenantId,
      }))
    )
  }

  revalidatePath(facilitiesPath(workspaceId))
  return { success: true, data }
}

// -----------------------------------------------------------------------------
// 삭제
// -----------------------------------------------------------------------------

/**
 * 시설 삭제. 하위 참조 없음(말단 엔티티).
 * tenant_id + workspace_id 를 WHERE 에 포함하여 격리한다.
 */
export async function deleteFacility(
  id: string,
  workspaceId: string
): Promise<ActionResult> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('facilities')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)

  if (error) {
    return { success: false, error: '시설 삭제 중 오류가 발생했습니다.' }
  }

  revalidatePath(facilitiesPath(workspaceId))
  return { success: true }
}
