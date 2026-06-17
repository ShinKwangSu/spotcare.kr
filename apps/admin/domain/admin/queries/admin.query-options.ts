// =============================================================================
// admin 도메인 — Query Options
// =============================================================================
// 모든 쿼리는 이 공유 옵션 팩토리를 통해 생성한다. 인라인 useQuery 금지.
// =============================================================================

import { queryOptions } from '@tanstack/react-query'
import { getAdminsAction, getAdminAction } from '../actions/admin.actions'
import { adminQueryKeys } from './admin.query-keys'

export const adminQueryOptions = {
  list: (page = 1) =>
    queryOptions({
      queryKey: adminQueryKeys.list(page),
      queryFn: () => getAdminsAction(page),
    }),
  detail: (adminId: string) =>
    queryOptions({
      queryKey: adminQueryKeys.detail(adminId),
      queryFn: () => getAdminAction(adminId),
      staleTime: 5 * 60_000,
    }),
}
