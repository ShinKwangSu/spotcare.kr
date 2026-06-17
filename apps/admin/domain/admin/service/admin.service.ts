// =============================================================================
// admin 도메인 — service (비즈니스 로직)
// =============================================================================
//
// 규칙:
// - repository 를 통해서만 DB 에 접근하고, Supabase 클라이언트는 주입받아 전달한다.
// - 도메인 DTO(AdminDto) 로만 외부에 반환한다(password_hash 노출 금지).
// - 비즈니스 에러는 사용자 친화 메시지로 throw 한다.
// =============================================================================

import type { TypedSupabaseClient } from '@spotcare/database'
import bcrypt from 'bcryptjs'
import { adminRepository } from '../repository/admin.repository'
import { toAdminDto } from '../mapper/admin.mapper'
import type {
  AdminDto,
  AdminListDto,
  CreateAdminInput,
  UpdateAdminInput,
} from '../types'

type Db = TypedSupabaseClient

const PAGE_SIZE = 20
const TEMP_PASSWORD = '12341234'
const SALT_ROUNDS = 10

export const adminService = {
  /** 어드민 목록 (페이지네이션 20건 단위) */
  async listAdmins(supabase: Db, page = 1): Promise<AdminListDto> {
    const safePage = page < 1 ? 1 : page
    const { admins, total } = await adminRepository.findAll(supabase, {
      page: safePage,
      pageSize: PAGE_SIZE,
    })
    return {
      admins: admins.map(toAdminDto),
      total,
      page: safePage,
      pageSize: PAGE_SIZE,
    }
  },

  /** 어드민 단건 조회 */
  async getAdmin(supabase: Db, id: string): Promise<AdminDto> {
    const admin = await adminRepository.findById(supabase, id)
    if (!admin) throw new Error('어드민 계정을 찾을 수 없습니다.')
    return toAdminDto(admin)
  },

  /**
   * 어드민 생성.
   * 임시 비밀번호 '12341234' 를 bcrypt 해싱하여 저장한다.
   * 이메일 중복 시 비즈니스 에러를 던진다.
   */
  async createAdmin(supabase: Db, input: CreateAdminInput): Promise<AdminDto> {
    const existing = await adminRepository.findByEmail(supabase, input.email)
    if (existing) throw new Error('이미 사용 중인 이메일입니다.')

    const passwordHash = await bcrypt.hash(TEMP_PASSWORD, SALT_ROUNDS)
    const created = await adminRepository.create(supabase, {
      email: input.email,
      name: input.name,
      password_hash: passwordHash,
    })
    return toAdminDto(created)
  },

  /**
   * 어드민 수정 (이름/이메일만).
   * 이메일 변경 시 타 계정과의 중복을 검증한다.
   */
  async updateAdmin(
    supabase: Db,
    id: string,
    input: UpdateAdminInput
  ): Promise<AdminDto> {
    const target = await adminRepository.findById(supabase, id)
    if (!target) throw new Error('어드민 계정을 찾을 수 없습니다.')

    if (input.email && input.email !== target.email) {
      const duplicate = await adminRepository.findByEmail(supabase, input.email)
      if (duplicate && duplicate.id !== id) {
        throw new Error('이미 사용 중인 이메일입니다.')
      }
    }

    const updated = await adminRepository.update(supabase, id, {
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
    })
    return toAdminDto(updated)
  },

  /**
   * 어드민 삭제.
   * 본인 계정은 삭제할 수 없다(requestingAdminId 와 동일하면 차단).
   */
  async deleteAdmin(
    supabase: Db,
    id: string,
    requestingAdminId: string
  ): Promise<void> {
    if (id === requestingAdminId) {
      throw new Error('본인 계정은 삭제할 수 없습니다.')
    }
    const target = await adminRepository.findById(supabase, id)
    if (!target) throw new Error('어드민 계정을 찾을 수 없습니다.')

    await adminRepository.delete(supabase, id)
  },

  /**
   * 비밀번호 변경.
   * 현재 비밀번호를 검증한 후 새 비밀번호를 해싱하여 저장한다.
   */
  async changePassword(
    supabase: Db,
    adminId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const admin = await adminRepository.findSecretById(supabase, adminId)
    if (!admin) throw new Error('어드민 계정을 찾을 수 없습니다.')

    const matched = await bcrypt.compare(currentPassword, admin.password_hash)
    if (!matched) throw new Error('현재 비밀번호가 올바르지 않습니다.')

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await adminRepository.updatePassword(supabase, adminId, newHash)
  },

  /** 전체 어드민 수 (대시보드용) */
  async countAdmins(supabase: Db): Promise<number> {
    return adminRepository.count(supabase)
  },
}
