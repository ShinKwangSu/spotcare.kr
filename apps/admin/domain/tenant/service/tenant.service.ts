// =============================================================================
// tenant 도메인 — service (비즈니스 로직)
// =============================================================================
//
// 규칙:
// - repository 를 통해서만 DB 에 접근하고, Supabase 클라이언트는 주입받아 전달한다.
// - 도메인 DTO 로만 외부에 반환한다(password_hash 노출 금지).
// - 비즈니스 에러는 사용자 친화 메시지로 throw 한다.
// =============================================================================

import type { TypedSupabaseClient } from '@spotcare/database'
import { tenantRepository } from '../repository/tenant.repository'
import { toTenantDto, toTenantDetailDto } from '../mapper/tenant.mapper'
import type {
  TenantDto,
  TenantDetailDto,
  TenantListDto,
  UpdateTenantInput,
} from '../types'

type Db = TypedSupabaseClient

const PAGE_SIZE = 20

export const tenantService = {
  /** 테넌트 목록 (검색 + 페이지네이션 20건 단위) */
  async listTenants(
    supabase: Db,
    page = 1,
    search?: string
  ): Promise<TenantListDto> {
    const safePage = page < 1 ? 1 : page
    const { tenants, total } = await tenantRepository.findAll(supabase, {
      page: safePage,
      pageSize: PAGE_SIZE,
      search,
    })
    return {
      tenants: tenants.map(toTenantDto),
      total,
      page: safePage,
      pageSize: PAGE_SIZE,
    }
  },

  /** 테넌트 상세 (기본 정보 + 워크스페이스 목록) */
  async getTenantDetail(
    supabase: Db,
    tenantId: string
  ): Promise<TenantDetailDto> {
    const tenant = await tenantRepository.findById(supabase, tenantId)
    if (!tenant) throw new Error('테넌트를 찾을 수 없습니다.')
    return toTenantDetailDto(tenant)
  },

  /** 테넌트 수정 (업체명/관리자명/전화번호) */
  async updateTenant(
    supabase: Db,
    tenantId: string,
    input: UpdateTenantInput
  ): Promise<TenantDto> {
    const updated = await tenantRepository.update(supabase, tenantId, {
      ...(input.companyName !== undefined
        ? { company_name: input.companyName }
        : {}),
      ...(input.adminName !== undefined ? { admin_name: input.adminName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    })
    return toTenantDto(updated)
  },

  /** 테넌트 삭제 (연관 데이터는 DB FK CASCADE) */
  async deleteTenant(supabase: Db, tenantId: string): Promise<void> {
    await tenantRepository.delete(supabase, tenantId)
  },

  /** 전체 테넌트 수 (대시보드용) */
  async countTenants(supabase: Db): Promise<number> {
    return tenantRepository.count(supabase)
  },
}
