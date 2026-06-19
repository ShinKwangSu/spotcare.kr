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

export type InspectionHistoryItem = {
  session_id: string
  submitted_at: string
  inspector_name: string | null
  inspector_phone: string | null
  pass_count: number
  fail_count: number
  total_count: number
}

export type InspectionHistoryDetail = {
  session_id: string
  submitted_at: string
  inspector_name: string | null
  inspector_phone: string | null
  items: {
    id: string
    item_name: string
    response_type: 'checklist' | 'photo'
    is_required: boolean
    sort_order: number
    result: boolean | string | null  // checklist: boolean, photo: URL string, 미응답: null
  }[]
}

export type PhotoUploadResult =
  | { success: true; url: string }
  | { success: false; error: string }

// =============================================================================
// 세션 + 점검 데이터 조회 — /inspect/[facilityId]/[sessionId] 서버 컴포넌트
// =============================================================================

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

export async function submitInspection(
  sessionId: string,
  facilityId: string,
  itemResults: Record<string, boolean | string>
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
    .insert({ facility_id: facilityId, inspector_id: inspector.id })
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

  // 날짜 경계는 KST(UTC+9) 기준으로 계산한다.
  // 서버가 UTC로 동작해도 한국 사용자 기준 "오늘/이번 달"이 올바르게 집계된다.
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000
  const nowKST = new Date(Date.now() + KST_OFFSET_MS)
  const todayStart = new Date(
    Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), nowKST.getUTCDate()) - KST_OFFSET_MS
  ).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(
    Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), 1) - KST_OFFSET_MS
  ).toISOString()

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

// =============================================================================
// 점검 이력 목록 — 관리자 시설 관리 화면에서 호출
// =============================================================================

export async function getInspectionHistory(
  facilityId: string
): Promise<InspectionHistoryItem[]> {
  const supabase = createClient()

  const { data: sessions } = await supabase
    .from('inspection_sessions')
    .select('id, completed_at, inspector_id')
    .eq('facility_id', facilityId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(100)

  if (!sessions?.length) return []

  const sessionIds = sessions.map((s) => s.id)
  const inspectorIds = [...new Set(sessions.map((s) => s.inspector_id).filter(Boolean) as string[])]

  const [resultsRes, inspectorsRes] = await Promise.all([
    supabase
      .from('inspection_results')
      .select('session_id, submitted_at, item_results')
      .in('session_id', sessionIds),
    inspectorIds.length
      ? supabase
          .from('inspectors')
          .select('id, name, phone')
          .in('id', inspectorIds)
      : Promise.resolve({ data: [] }),
  ])

  const resultMap = new Map(
    (resultsRes.data ?? []).map((r) => [r.session_id, r])
  )
  const inspectorMap = new Map(
    (inspectorsRes.data ?? []).map((i) => [i.id, i])
  )

  return sessions.map((s) => {
    const result = resultMap.get(s.id)
    const inspector = s.inspector_id ? inspectorMap.get(s.inspector_id) : null
    const values = Object.values(result?.item_results ?? {}) as boolean[]
    const passCount = values.filter(Boolean).length

    return {
      session_id: s.id,
      submitted_at: result?.submitted_at ?? s.completed_at ?? '',
      inspector_name: inspector?.name ?? null,
      inspector_phone: inspector?.phone ?? null,
      pass_count: passCount,
      fail_count: values.length - passCount,
      total_count: values.length,
    }
  })
}

// =============================================================================
// 점검 이력 상세 — 이력 목록에서 특정 항목 클릭 시 호출
// =============================================================================

export async function getInspectionDetail(
  sessionId: string,
  facilityId: string
): Promise<InspectionHistoryDetail | null> {
  const supabase = createClient()

  const { data: session } = await supabase
    .from('inspection_sessions')
    .select('id, completed_at, inspector_id')
    .eq('id', sessionId)
    .eq('facility_id', facilityId)
    .eq('status', 'completed')
    .maybeSingle()

  if (!session) return null

  const [resultRes, inspectorRes, fcRes] = await Promise.all([
    supabase
      .from('inspection_results')
      .select('submitted_at, item_results')
      .eq('session_id', sessionId)
      .maybeSingle(),
    session.inspector_id
      ? supabase
          .from('inspectors')
          .select('name, phone')
          .eq('id', session.inspector_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('facility_checklists')
      .select('checklist_id')
      .eq('facility_id', facilityId)
      .maybeSingle(),
  ])

  // 체크리스트 항목은 삭제된 항목도 포함해 이력 표시 (소프트딜리트 필터 제거)
  let allItems: ChecklistItem[] = []
  if (fcRes.data?.checklist_id) {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('id, item_name, is_required, sort_order, deleted_at')
      .eq('checklist_id', fcRes.data.checklist_id)
      .order('sort_order', { ascending: true })
    allItems = (items ?? []) as ChecklistItem[]
  }

  const itemResults = resultRes.data?.item_results ?? {}

  return {
    session_id: session.id,
    submitted_at: resultRes.data?.submitted_at ?? session.completed_at ?? '',
    inspector_name: inspectorRes.data?.name ?? null,
    inspector_phone: inspectorRes.data?.phone ?? null,
    items: allItems.map((item) => ({
      id: item.id,
      item_name: item.item_name,
      response_type: item.response_type,
      is_required: item.is_required,
      sort_order: item.sort_order,
      result: item.id in itemResults ? itemResults[item.id] : null,
    })),
  }
}

// =============================================================================
// 사진 업로드 — inspection-form 클라이언트 컴포넌트에서 호출
// =============================================================================

export async function uploadInspectionPhoto(
  sessionId: string,
  facilityId: string,
  itemId: string,
  formData: FormData
): Promise<PhotoUploadResult> {
  const supabase = createClient()

  // 세션이 아직 유효한지 확인
  const { data: session } = await supabase
    .from('inspection_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('facility_id', facilityId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) {
    return { success: false, error: '세션이 만료됐습니다. QR을 다시 찍어주세요.' }
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { success: false, error: '파일이 없습니다.' }
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: '파일 크기는 10MB 이하여야 합니다.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${facilityId}/${sessionId}/${itemId}.${ext}`

  const { error } = await supabase.storage
    .from('inspection-photos')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (error) {
    return { success: false, error: '사진 업로드 중 오류가 발생했습니다.' }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('inspection-photos')
    .getPublicUrl(path)

  return { success: true, url: publicUrl }
}
