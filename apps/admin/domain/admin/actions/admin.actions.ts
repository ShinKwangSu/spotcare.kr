'use server'

// =============================================================================
// admin 도메인 — Server Actions (진입점)
// =============================================================================
//
// 규칙:
// - 모든 액션 진입부에서 requireAdmin() 으로 인증을 강제한다.
// - 변경 액션: AdminActionResult 반환. 조회 액션: 실패 시 throw.
// - 입력은 Zod 로 검증한다(클라이언트 검증만으로는 충분하지 않다).
// - Supabase 클라이언트(service_role)는 이 레이어에서만 생성해 service 로 주입한다.
// - 슈퍼어드민은 전역 권한이므로 tenant_id 필터가 없다.
// =============================================================================

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { adminService } from '../service/admin.service'
import type { AdminActionResult, AdminDto, AdminListDto } from '../types'

// -----------------------------------------------------------------------------
// 검증 스키마
// -----------------------------------------------------------------------------

const createAdminSchema = z.object({
  email: z.string().trim().email('올바른 이메일 형식이 아닙니다.'),
  name: z.string().trim().min(1, '이름을 입력해주세요.').max(100, '이름이 너무 깁니다.'),
})

const updateAdminSchema = z.object({
  email: z.string().trim().email('올바른 이메일 형식이 아닙니다.').optional(),
  name: z
    .string()
    .trim()
    .min(1, '이름을 입력해주세요.')
    .max(100, '이름이 너무 깁니다.')
    .optional(),
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z.string().min(8, '새 비밀번호는 8자 이상이어야 합니다.'),
    confirmPassword: z.string().min(1, '새 비밀번호 확인을 입력해주세요.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: '새 비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })

// -----------------------------------------------------------------------------
// 조회 액션 (실패 시 throw)
// -----------------------------------------------------------------------------

export async function getAdminsAction(page = 1): Promise<AdminListDto> {
  await requireAdmin()
  const supabase = createClient()
  return adminService.listAdmins(supabase, page)
}

export async function getAdminAction(adminId: string): Promise<AdminDto> {
  await requireAdmin()
  const supabase = createClient()
  return adminService.getAdmin(supabase, adminId)
}

// -----------------------------------------------------------------------------
// 변경 액션 (AdminActionResult 반환)
// -----------------------------------------------------------------------------

export async function createAdminAction(
  _prevState: AdminActionResult<AdminDto> | undefined,
  formData: FormData
): Promise<AdminActionResult<AdminDto>> {
  try {
    await requireAdmin()
    const parsed = createAdminSchema.safeParse({
      email: formData.get('email'),
      name: formData.get('name'),
    })
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? '입력값을 확인해주세요.',
      }
    }

    const supabase = createClient()
    const admin = await adminService.createAdmin(supabase, parsed.data)
    revalidatePath('/dashboard/admins')
    return { success: true, data: admin }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '어드민 생성 중 오류가 발생했습니다.',
    }
  }
}

export async function updateAdminAction(
  adminId: string,
  _prevState: AdminActionResult<AdminDto> | undefined,
  formData: FormData
): Promise<AdminActionResult<AdminDto>> {
  try {
    await requireAdmin()
    const raw = {
      email: formData.get('email') ?? undefined,
      name: formData.get('name') ?? undefined,
    }
    const parsed = updateAdminSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? '입력값을 확인해주세요.',
      }
    }

    const supabase = createClient()
    const admin = await adminService.updateAdmin(supabase, adminId, parsed.data)
    revalidatePath('/dashboard/admins')
    revalidatePath(`/dashboard/admins/${adminId}`)
    return { success: true, data: admin }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '어드민 수정 중 오류가 발생했습니다.',
    }
  }
}

export async function deleteAdminAction(
  adminId: string
): Promise<AdminActionResult> {
  try {
    const { adminId: requestingAdminId } = await requireAdmin()
    const supabase = createClient()
    await adminService.deleteAdmin(supabase, adminId, requestingAdminId)
    revalidatePath('/dashboard/admins')
    return { success: true, data: undefined }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '어드민 삭제 중 오류가 발생했습니다.',
    }
  }
}

export async function changePasswordAction(
  _prevState: AdminActionResult | undefined,
  formData: FormData
): Promise<AdminActionResult> {
  try {
    const { adminId } = await requireAdmin()
    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    })
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? '입력값을 확인해주세요.',
      }
    }

    const supabase = createClient()
    await adminService.changePassword(
      supabase,
      adminId,
      parsed.data.currentPassword,
      parsed.data.newPassword
    )
    return { success: true, data: undefined }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '비밀번호 변경 중 오류가 발생했습니다.',
    }
  }
}
