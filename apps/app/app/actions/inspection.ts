'use server'

// =============================================================================
// spotcare.kr MVP — 점검 세션/결과 Server Actions (공개, 인증 불필요)
// =============================================================================
// 보안 모델:
//   - 인증 없이 service_role 로 직접 접근.
//   - inspection_sessions.id (UUIDv4) 가 추측 불가능한 일회성 토큰.
//   - 세션 유효성: status='active' AND expires_at > NOW() (DB 단에서 체크).
//   - 제출 후 status='completed' 로 변경 → 재제출/재접근 차단.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import type { InspectionSession, ChecklistItem, Facility } from '@/types/database'

// =============================================================================
// 타입
// =============================================================================

export type InspectionPageData = {
  session: InspectionSession
  facility: Facility
  checklistItems: ChecklistItem[]
}

export type InspectionSessionResult =
  | { valid: true; data: InspectionPageData }
  | { valid: false; reason: 'expired' | 'completed' | 'not_found' }

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export type CreateSessionResult =
  | { success: true; sessionId: string }
  | { success: false; reason: 'not_found' | 'no_checklist' | 'session_error' }

export type VerifyResult =
  | { success: true; sessionId: string }
  | { success: false; reason: 'unauthorized' | 'no_checklist' | 'not_found' | 'session_error' }

export type InspectStatusData = {
  facility: Facility
  lastInspection: string | null
  dailyCount: number
  weeklyCount: number
  monthlyCount: number
  checklistItems: ChecklistItem[]
  hasChecklist: boolean
}

// =============================================================================
// 세션 생성 — /inspect/[facilityId] 서버 컴포넌트에서 호출
// redirect()는 호출부(Server Component)에서 직접 처리한다.
// =============================================================================

export async function createInspectionSession(
  facilityId: string
): Promise<CreateSessionResult> {
  const supabase = createClient()

  const { data: facilityRow } = await supabase
    .from('facilities')
    .select('id')
    .eq('id', facilityId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!facilityRow) return { success: false, reason: 'not_found' }

  const { data: fcRow } = await supabase
    .from('facility_checklists')
    .select('checklist_id')
    .eq('facility_id', facilityId)
    .maybeSingle()

  if (!fcRow?.checklist_id) return { success: false, reason: 'no_checklist' }

  const { data: session, error } = await supabase
    .from('inspection_sessions')
    .insert({ facility_id: facilityId })
    .select()
    .single()

  if (error || !session) return { success: false, reason: 'session_error' }

  return { success: true, sessionId: session.id }
}

// =============================================================================
// 세션 + 점검 데이터 조회 — /inspect/[facilityId]/[sessionId] 서버 컴포넌트
// =============================================================================

/**
 * sessionId 로 세션을 조회하고 유효성을 검증한다.
 * 만료/완료 체크는 DB 단에서 수행(expires_at > NOW()).
 */
export async function getInspectionSession(
  facilityId: string,
  sessionId: string
): Promise<InspectionSessionResult> {
  const supabase = createClient()

  // status='active' + expires_at > 현재 시각 을 DB 단에서 동시에 체크
  const { data: session } = await supabase
    .from('inspection_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('facility_id', facilityId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    // 만료 혹은 완료 여부 판별을 위해 상태만 별도 조회
    const { data: raw } = await supabase
      .from('inspection_sessions')
      .select('status')
      .eq('id', sessionId)
      .eq('facility_id', facilityId)
      .maybeSingle()

    if (!raw) return { valid: false, reason: 'not_found' }
    return {
      valid: false,
      reason: raw.status === 'completed' ? 'completed' : 'expired',
    }
  }

  const { data: facility } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', facilityId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!facility) return { valid: false, reason: 'not_found' }

  const { data: fcRow } = await supabase
    .from('facility_checklists')
    .select('checklist_id')
    .eq('facility_id', facilityId)
    .maybeSingle()

  if (!fcRow?.checklist_id) return { valid: false, reason: 'not_found' }

  const { data: items } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('checklist_id', fcRow.checklist_id)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  return {
    valid: true,
    data: {
      session: session as InspectionSession,
      facility: facility as Facility,
      checklistItems: (items ?? []) as ChecklistItem[],
    },
  }
}

// =============================================================================
// 점검 제출 — InspectionForm 클라이언트 컴포넌트에서 호출
// =============================================================================

/**
 * 점검 결과를 저장하고 세션을 완료 처리한다.
 * 제출 시점에 세션 유효성을 재검증(TOCTOU 방지).
 */
export async function submitInspection(
  sessionId: string,
  facilityId: string,
  itemResults: Record<string, boolean>
): Promise<ActionResult> {
  const supabase = createClient()

  const { data: session } = await supabase
    .from('inspection_sessions')
    .select('id, status, expires_at')
    .eq('id', sessionId)
    .eq('facility_id', facilityId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    return { success: false, error: '세션이 만료됐습니다. QR을 다시 찍어주세요.' }
  }

  const { error: resultError } = await supabase
    .from('inspection_results')
    .insert({ session_id: sessionId, facility_id: facilityId, item_results: itemResults })

  if (resultError) {
    return { success: false, error: '결과 저장 중 오류가 발생했습니다.' }
  }

  const { error: sessionError } = await supabase
    .from('inspection_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (sessionError) {
    return { success: false, error: '세션 처리 중 오류가 발생했습니다.' }
  }

  return { success: true }
}

// =============================================================================
// 전화번호 인증 후 세션 생성 — InspectEntryButton 클라이언트 컴포넌트에서 호출
// =============================================================================

export async function verifyAndCreateSession(
  facilityId: string,
  phoneLast4: string
): Promise<VerifyResult> {
  if (!/^\d{4}$/.test(phoneLast4)) {
    return { success: false, reason: 'unauthorized' }
  }

  const supabase = createClient()

  const { data: facility } = await supabase
    .from('facilities')
    .select('id, workspace_id')
    .eq('id', facilityId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!facility) return { success: false, reason: 'not_found' }

  const { data: fcRow } = await supabase
    .from('facility_checklists')
    .select('checklist_id')
    .eq('facility_id', facilityId)
    .maybeSingle()

  if (!fcRow?.checklist_id) return { success: false, reason: 'no_checklist' }

  // 같은 워크스페이스 점검자 중 전화번호 뒤 4자리 일치 여부 확인
  const { data: inspector } = await supabase
    .from('inspectors')
    .select('id')
    .eq('workspace_id', facility.workspace_id)
    .is('deleted_at', null)
    .like('phone', `%${phoneLast4}`)
    .limit(1)
    .maybeSingle()

  if (!inspector) return { success: false, reason: 'unauthorized' }

  const { data: session, error } = await supabase
    .from('inspection_sessions')
    .insert({ facility_id: facilityId })
    .select()
    .single()

  if (error || !session) return { success: false, reason: 'session_error' }

  return { success: true, sessionId: session.id }
}

// =============================================================================
// 공개 현황 페이지 데이터 조회 — /inspect/[facilityId] 서버 컴포넌트에서 호출
// =============================================================================

export async function getInspectStatus(
  facilityId: string
): Promise<InspectStatusData | null> {
  const supabase = createClient()

  const now = new Date()
  const todayStart = new Date(
    now.getFullYear(), now.getMonth(), now.getDate()
  ).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [facilityRes, lastRes, dailyRes, weeklyRes, monthlyRes, fcRes] =
    await Promise.all([
      supabase.from('facilities').select('*').eq('id', facilityId).is('deleted_at', null).maybeSingle(),
      supabase
        .from('inspection_results')
        .select('submitted_at')
        .eq('facility_id', facilityId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('inspection_results')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facilityId)
        .gte('submitted_at', todayStart),
      supabase
        .from('inspection_results')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facilityId)
        .gte('submitted_at', weekAgo),
      supabase
        .from('inspection_results')
        .select('*', { count: 'exact', head: true })
        .eq('facility_id', facilityId)
        .gte('submitted_at', monthStart),
      supabase
        .from('facility_checklists')
        .select('checklist_id')
        .eq('facility_id', facilityId)
        .maybeSingle(),
    ])

  if (!facilityRes.data) return null

  let checklistItems: ChecklistItem[] = []
  if (fcRes.data?.checklist_id) {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', fcRes.data.checklist_id)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
    checklistItems = (items ?? []) as ChecklistItem[]
  }

  return {
    facility: facilityRes.data as Facility,
    lastInspection: lastRes.data?.submitted_at ?? null,
    dailyCount: dailyRes.count ?? 0,
    weeklyCount: weeklyRes.count ?? 0,
    monthlyCount: monthlyRes.count ?? 0,
    checklistItems,
    hasChecklist: !!fcRes.data?.checklist_id,
  }
}
