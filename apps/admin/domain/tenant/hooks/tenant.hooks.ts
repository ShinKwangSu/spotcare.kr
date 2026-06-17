'use client'

// =============================================================================
// tenant 도메인 — Client Hooks
// =============================================================================
// Client Component 전용. 공유 query options 와 mutation + invalidation 만 사용한다.
// =============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tenantQueryOptions, tenantQueryKeys } from '../queries'
import {
  updateTenantAction,
  deleteTenantAction,
} from '../actions/tenant.actions'

/** 테넌트 목록 조회 (검색 + 페이지네이션) */
export function useTenants(page = 1, search?: string) {
  return useQuery(tenantQueryOptions.list(page, search))
}

/** 테넌트 상세 조회 */
export function useTenant(tenantId: string) {
  return useQuery(tenantQueryOptions.detail(tenantId))
}

/** 테넌트 수정 */
export function useUpdateTenant(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      updateTenantAction(tenantId, undefined, formData),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.all }),
  })
}

/** 테넌트 삭제 */
export function useDeleteTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tenantId: string) => deleteTenantAction(tenantId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.all }),
  })
}
