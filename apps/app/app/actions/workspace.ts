'use server'

// =============================================================================
// spotcare.kr MVP — 워크스페이스 CRUD Server Actions
// =============================================================================
//
// 멀티테넌트 격리 1차 방어선: 모든 쿼리에 tenant_id 필터를 명시한다.
//   - SELECT/UPDATE/DELETE → .eq('tenant_id', tenantId)
//   - INSERT → tenant_id 값 주입
// (service_role 키는 RLS 를 우회하므로 이 코드 레벨 필터가 실질 격리선이다.)
//
// 소프트 딜리트: .delete() 대신 deleted_at = NOW() 업데이트.
//   - 모든 SELECT 에 .is('deleted_at', null) 필터 추가.
//   - deleteWorkspace 는 하위 엔티티(facility_types, facilities, inspectors,
//     checklists, checklist_items)를 코드 레벨에서 cascade soft delete 처리.
//
// 반환 타입 규약:
//   성공 → { success: true, data?: T }
//   실패 → { success: false, error: string }
// =============================================================================

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { workspaceSchema } from '@/lib/validations/workspace'
import type { Workspace } from '@/types/database'

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

const WORKSPACES_PATH = '/dashboard/workspaces'

async function getTenantId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.tenantId ?? null
}

// -----------------------------------------------------------------------------
// 조회
// -----------------------------------------------------------------------------

export async function getWorkspaces(): Promise<Workspace[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function getWorkspace(id: string): Promise<ActionResult<Workspace>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return { success: false, error: '워크스페이스 조회 중 오류가 발생했습니다.' }
  if (!data) return { success: false, error: '워크스페이스를 찾을 수 없습니다.' }
  return { success: true, data }
}

// -----------------------------------------------------------------------------
// 생성
// -----------------------------------------------------------------------------

export async function createWorkspace(formData: FormData): Promise<ActionResult<Workspace>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const parsed = workspaceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'
    return { success: false, error: first }
  }

  const { workspace_name, max_floor, min_floor, address, address_detail } = parsed.data
  const minFloorValue = min_floor > 0 ? -min_floor : min_floor

  const supabase = createClient()
  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      tenant_id: tenantId,
      workspace_name,
      max_floor,
      min_floor: minFloorValue,
      address: address ?? null,
      address_detail: address_detail ?? null,
    })
    .select()
    .single()

  if (error) return { success: false, error: '워크스페이스 생성 중 오류가 발생했습니다.' }

  revalidatePath(WORKSPACES_PATH)
  return { success: true, data }
}

// -----------------------------------------------------------------------------
// 수정
// -----------------------------------------------------------------------------

export async function updateWorkspace(
  id: string,
  formData: FormData
): Promise<ActionResult<Workspace>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const parsed = workspaceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'
    return { success: false, error: first }
  }

  const { workspace_name, max_floor, min_floor, address, address_detail } = parsed.data
  const minFloorValue = min_floor > 0 ? -min_floor : min_floor

  const supabase = createClient()
  const { data, error } = await supabase
    .from('workspaces')
    .update({
      workspace_name,
      max_floor,
      min_floor: minFloorValue,
      address: address ?? null,
      address_detail: address_detail ?? null,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .select()
    .maybeSingle()

  if (error) return { success: false, error: '워크스페이스 수정 중 오류가 발생했습니다.' }
  if (!data) return { success: false, error: '워크스페이스를 찾을 수 없습니다.' }

  revalidatePath(WORKSPACES_PATH)
  return { success: true, data }
}

// -----------------------------------------------------------------------------
// 삭제 (소프트 딜리트)
// -----------------------------------------------------------------------------

/**
 * 워크스페이스 소프트 딜리트.
 * DB CASCADE 대신 코드에서 하위 엔티티를 일괄 soft delete 처리한다.
 */
export async function deleteWorkspace(id: string): Promise<ActionResult> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const now = new Date().toISOString()
  const supabase = createClient()

  // 하위 엔티티 cascade soft delete (순서 무관 — 독립적)
  await Promise.all([
    supabase
      .from('checklist_items')
      .update({ deleted_at: now })
      .eq('workspace_id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    supabase
      .from('facilities')
      .update({ deleted_at: now })
      .eq('workspace_id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    supabase
      .from('facility_types')
      .update({ deleted_at: now })
      .eq('workspace_id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    supabase
      .from('inspectors')
      .update({ deleted_at: now })
      .eq('workspace_id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    supabase
      .from('checklists')
      .update({ deleted_at: now })
      .eq('workspace_id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
  ])

  const { error } = await supabase
    .from('workspaces')
    .update({ deleted_at: now })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (error) return { success: false, error: '워크스페이스 삭제 중 오류가 발생했습니다.' }

  revalidatePath(WORKSPACES_PATH)
  return { success: true }
}
