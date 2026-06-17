'use client'

// =============================================================================
// admin 도메인 — Client Hooks
// =============================================================================
// Client Component 전용. 공유 query options 와 mutation + invalidation 만 사용한다.
// =============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminQueryOptions, adminQueryKeys } from '../queries'
import {
  createAdminAction,
  updateAdminAction,
  deleteAdminAction,
  changePasswordAction,
} from '../actions/admin.actions'

/** 어드민 목록 조회 */
export function useAdmins(page = 1) {
  return useQuery(adminQueryOptions.list(page))
}

/** 어드민 단건 조회 */
export function useAdmin(adminId: string) {
  return useQuery(adminQueryOptions.detail(adminId))
}

/** 어드민 생성 */
export function useCreateAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => createAdminAction(undefined, formData),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
  })
}

/** 어드민 수정 */
export function useUpdateAdmin(adminId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      updateAdminAction(adminId, undefined, formData),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
  })
}

/** 어드민 삭제 */
export function useDeleteAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (adminId: string) => deleteAdminAction(adminId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all }),
  })
}

/** 비밀번호 변경 (목록 무효화 불필요) */
export function useChangePassword() {
  return useMutation({
    mutationFn: (formData: FormData) => changePasswordAction(undefined, formData),
  })
}
