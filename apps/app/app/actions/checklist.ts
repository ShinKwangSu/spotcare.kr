'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { checklistSchema } from '@/lib/validations/checklist'
import type { Checklist } from '@/types/database'
import type { ActionResult } from '@/app/actions/workspace'

async function getTenantId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.tenantId ?? null
}

function checklistsPath(workspaceId: string): string {
  return `/dashboard/${workspaceId}/checklists`
}

export async function getChecklists(workspaceId: string): Promise<Checklist[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('checklists')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function createChecklist(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<Checklist>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const raw = Object.fromEntries(formData)
  const daysRaw = formData.get('days')
  const parsed = checklistSchema.safeParse({
    ...raw,
    days: daysRaw ? JSON.parse(daysRaw as string) : undefined,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }
  }

  const { checklist_name, description, repeat_cycle, count, days } = parsed.data
  const supabase = createClient()
  const { data, error } = await supabase
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

  revalidatePath(checklistsPath(workspaceId))
  return { success: true, data }
}

export async function updateChecklist(
  id: string,
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<Checklist>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const raw = Object.fromEntries(formData)
  const daysRaw = formData.get('days')
  const parsed = checklistSchema.safeParse({
    ...raw,
    days: daysRaw ? JSON.parse(daysRaw as string) : undefined,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }
  }

  const { checklist_name, description, repeat_cycle, count, days } = parsed.data
  const supabase = createClient()
  const { data, error } = await supabase
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
    .select()
    .maybeSingle()

  if (error) return { success: false, error: '점검표 수정 중 오류가 발생했습니다.' }
  if (!data) return { success: false, error: '점검표를 찾을 수 없습니다.' }

  revalidatePath(checklistsPath(workspaceId))
  return { success: true, data }
}

export async function deleteChecklist(
  id: string,
  workspaceId: string
): Promise<ActionResult> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('checklists')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: '점검표 삭제 중 오류가 발생했습니다.' }

  revalidatePath(checklistsPath(workspaceId))
  return { success: true }
}
