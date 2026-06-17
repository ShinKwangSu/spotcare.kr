'use server'

// =============================================================================
// tenant 도메인 — Server Actions (진입점)
// =============================================================================
//
// 규칙:
// - 모든 액션 진입부에서 requireAdmin() 으로 인증을 강제한다.
// - 변경 액션: TenantActionResult 반환. 조회 액션: 실패 시 throw.
// - 입력은 Zod 로 검증한다.
// - Supabase 클라이언트(service_role)는 이 레이어에서만 생성해 service 로 주입한다.
// - 슈퍼어드민은 전역 권한이므로 tenant_id 필터가 없다(의도된 설계).
// =============================================================================

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { tenantService } from '../service/tenant.service'
import type {
  TenantActionResult,
  TenantDto,
  TenantDetailDto,
  TenantListDto,
} from '../types'

// -----------------------------------------------------------------------------
// 검증 스키마
// -----------------------------------------------------------------------------

const updateTenantSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, '업체명을 입력해주세요.')
    .max(255, '업체명이 너무 깁니다.')
    .optional(),
  adminName: z
    .string()
    .trim()
    .min(1, '관리자명을 입력해주세요.')
    .max(100, '관리자명이 너무 깁니다.')
    .optional(),
  phone: z
    .string()
    .trim()
    .min(1, '전화번호를 입력해주세요.')
    .max(50, '전화번호가 너무 깁니다.')
    .optional(),
})

// -----------------------------------------------------------------------------
// 조회 액션 (실패 시 throw)
// -----------------------------------------------------------------------------

export async function getTenantsAction(
  page = 1,
  search?: string
): Promise<TenantListDto> {
  await requireAdmin()
  const supabase = createClient()
  return tenantService.listTenants(supabase, page, search)
}

export async function getTenantDetailAction(
  tenantId: string
): Promise<TenantDetailDto> {
  await requireAdmin()
  const supabase = createClient()
  return tenantService.getTenantDetail(supabase, tenantId)
}

// -----------------------------------------------------------------------------
// 변경 액션 (TenantActionResult 반환)
// -----------------------------------------------------------------------------

export async function updateTenantAction(
  tenantId: string,
  _prevState: TenantActionResult<TenantDto> | undefined,
  formData: FormData
): Promise<TenantActionResult<TenantDto>> {
  try {
    await requireAdmin()
    const raw = {
      companyName: formData.get('companyName') ?? undefined,
      adminName: formData.get('adminName') ?? undefined,
      phone: formData.get('phone') ?? undefined,
    }
    const parsed = updateTenantSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? '입력값을 확인해주세요.',
      }
    }

    const supabase = createClient()
    const tenant = await tenantService.updateTenant(
      supabase,
      tenantId,
      parsed.data
    )
    revalidatePath('/dashboard/tenants')
    revalidatePath(`/dashboard/tenants/${tenantId}`)
    return { success: true, data: tenant }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '테넌트 수정 중 오류가 발생했습니다.',
    }
  }
}

export async function deleteTenantAction(
  tenantId: string
): Promise<TenantActionResult> {
  try {
    await requireAdmin()
    const supabase = createClient()
    await tenantService.deleteTenant(supabase, tenantId)
    revalidatePath('/dashboard/tenants')
    return { success: true, data: undefined }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '테넌트 삭제 중 오류가 발생했습니다.',
    }
  }
}
