'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { checklistSchema } from '@/lib/validations/checklist'
import type { ChecklistWithItems } from '@/types/database'
import type { ActionResult } from '@/app/actions/workspace'

async function getTenantId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.tenantId ?? null
}

function checklistsPath(workspaceId: string): string {
  return `/dashboard/${workspaceId}/checklists`
}

export async function getChecklists(workspaceId: string): Promise<ChecklistWithItems[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('checklists')
    .select('*, checklist_items(id, item_name, response_type, is_required, sort_order, deleted_at)')
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) return []

  // 삭제된 항목 제외 후 sort_order 기준 정렬
  const rows = (data ?? []) as unknown as ChecklistWithItems[]
  return rows.map((c) => ({
    ...c,
    checklist_items: [...(c.checklist_items ?? [])]
      .filter((item) => item.deleted_at === null || item.deleted_at === undefined)
      .sort((a, b) => a.sort_order - b.sort_order),
  }))
}

export async function createChecklist(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<ChecklistWithItems>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const raw = Object.fromEntries(formData)
  const parsed = checklistSchema.safeParse({
    ...raw,
    days: raw.days ? JSON.parse(raw.days as string) : undefined,
    items: raw.items_json ? JSON.parse(raw.items_json as string) : [],
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }
  }

  const { checklist_name, description, repeat_cycle, count, days, items } = parsed.data
  const supabase = createClient()

  const { data: checklist, error } = await supabase
    .from('checklists')
    .insert({
      workspace_id: workspaceId,
      tenant_id: tenantId,
      checklist_name,
      description: description || null,
      repeat_cycle,
      count,
      days: repeat_cycle === 'weekly' ? (days ?? []) : null,
    })
    .select()
    .single()

  if (error) return { success: false, error: '점검표 생성 중 오류가 발생했습니다.' }

  const { error: itemsError } = await supabase.from('checklist_items').insert(
    items.map((item, idx) => ({
      checklist_id: checklist.id,
      workspace_id: workspaceId,
      tenant_id: tenantId,
      item_name: item.item_name,
      response_type: item.response_type,
      is_required: item.is_required,
      sort_order: idx,
    }))
  )

  if (itemsError) return { success: false, error: '항목 저장 중 오류가 발생했습니다.' }

  revalidatePath(checklistsPath(workspaceId))
  return { success: true }
}

export async function updateChecklist(
  id: string,
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<ChecklistWithItems>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const raw = Object.fromEntries(formData)
  const parsed = checklistSchema.safeParse({
    ...raw,
    days: raw.days ? JSON.parse(raw.days as string) : undefined,
    items: raw.items_json ? JSON.parse(raw.items_json as string) : [],
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }
  }

  const { checklist_name, description, repeat_cycle, count, days, items } = parsed.data
  const supabase = createClient()

  const { error } = await supabase
    .from('checklists')
    .update({
      checklist_name,
      description: description || null,
      repeat_cycle,
      count,
      days: repeat_cycle === 'weekly' ? (days ?? []) : null,
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (error) return { success: false, error: '점검표 수정 중 오류가 발생했습니다.' }

  // 기존 활성 항목 ID 조회
  const { data: existingRows } = await supabase
    .from('checklist_items')
    .select('id')
    .eq('checklist_id', id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  const existingIds = new Set((existingRows ?? []).map((i) => i.id))
  const formIds = new Set(items.filter((i) => i.id).map((i) => i.id as string))
  const now = new Date().toISOString()

  // 폼에서 제거된 항목 소프트 딜리트
  const toDelete = [...existingIds].filter((eid) => !formIds.has(eid))
  if (toDelete.length > 0) {
    await supabase
      .from('checklist_items')
      .update({ deleted_at: now })
      .in('id', toDelete)
      .eq('tenant_id', tenantId)
  }

  // 기존 항목 업데이트 (UUID 유지)
  const toUpdate = items.filter((i) => i.id && existingIds.has(i.id))
  await Promise.all(
    toUpdate.map((item) =>
      supabase
        .from('checklist_items')
        .update({
          item_name: item.item_name,
          response_type: item.response_type,
          is_required: item.is_required,
          sort_order: items.indexOf(item),
        })
        .eq('id', item.id!)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
    )
  )

  // 새 항목만 INSERT
  const toInsert = items.filter((i) => !i.id)
  if (toInsert.length > 0) {
    const { error: itemsError } = await supabase.from('checklist_items').insert(
      toInsert.map((item) => ({
        checklist_id: id,
        workspace_id: workspaceId,
        tenant_id: tenantId,
        item_name: item.item_name,
        response_type: item.response_type,
        is_required: item.is_required,
        sort_order: items.indexOf(item),
      }))
    )
    if (itemsError) return { success: false, error: '항목 저장 중 오류가 발생했습니다.' }
  }

  revalidatePath(checklistsPath(workspaceId))
  return { success: true }
}

export async function deleteChecklist(
  id: string,
  workspaceId: string
): Promise<ActionResult> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const now = new Date().toISOString()
  const supabase = createClient()

  // 하위 항목 먼저 소프트 딜리트
  await supabase
    .from('checklist_items')
    .update({ deleted_at: now })
    .eq('checklist_id', id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  const { error } = await supabase
    .from('checklists')
    .update({ deleted_at: now })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (error) return { success: false, error: '점검표 삭제 중 오류가 발생했습니다.' }

  revalidatePath(checklistsPath(workspaceId))
  return { success: true }
}
