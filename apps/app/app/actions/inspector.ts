'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { inspectorSchema } from '@/lib/validations/inspector'
import type { Inspector } from '@/types/database'
import type { ActionResult } from '@/app/actions/workspace'

const INSPECTORS_PATH = '/dashboard/inspectors'

async function getTenantId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.tenantId ?? null
}

export async function getInspectors(): Promise<Inspector[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('inspectors')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function createInspector(
  formData: FormData
): Promise<ActionResult<Inspector>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const parsed = inspectorSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }
  }

  const { name, phone, email } = parsed.data
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inspectors')
    .insert({
      tenant_id: tenantId,
      name,
      phone: phone || null,
      email: email || null,
    })
    .select()
    .single()

  if (error) return { success: false, error: '점검자 생성 중 오류가 발생했습니다.' }

  revalidatePath(INSPECTORS_PATH)
  return { success: true, data }
}

export async function updateInspector(
  id: string,
  formData: FormData
): Promise<ActionResult<Inspector>> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const parsed = inspectorSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }
  }

  const { name, phone, email } = parsed.data
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inspectors')
    .update({ name, phone: phone || null, email: email || null })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .maybeSingle()

  if (error) return { success: false, error: '점검자 수정 중 오류가 발생했습니다.' }
  if (!data) return { success: false, error: '점검자를 찾을 수 없습니다.' }

  revalidatePath(INSPECTORS_PATH)
  return { success: true, data }
}

export async function deleteInspector(id: string): Promise<ActionResult> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, error: '로그인이 필요합니다.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('inspectors')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: '점검자 삭제 중 오류가 발생했습니다.' }

  revalidatePath(INSPECTORS_PATH)
  return { success: true }
}
