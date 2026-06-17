// =============================================================================
// tenant 도메인 — Query Options
// =============================================================================
// 모든 쿼리는 이 공유 옵션 팩토리를 통해 생성한다. 인라인 useQuery 금지.
// =============================================================================

import { queryOptions } from '@tanstack/react-query'
import {
  getTenantsAction,
  getTenantDetailAction,
} from '../actions/tenant.actions'
import { tenantQueryKeys } from './tenant.query-keys'

export const tenantQueryOptions = {
  list: (page = 1, search?: string) =>
    queryOptions({
      queryKey: tenantQueryKeys.list(page, search),
      queryFn: () => getTenantsAction(page, search),
    }),
  detail: (tenantId: string) =>
    queryOptions({
      queryKey: tenantQueryKeys.detail(tenantId),
      queryFn: () => getTenantDetailAction(tenantId),
      staleTime: 5 * 60_000,
    }),
}
