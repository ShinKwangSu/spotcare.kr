// =============================================================================
// runPrefetch 유틸리티 — apps/admin
// =============================================================================
// Server Component 에서 도메인 prefetch 함수들을 병렬 실행하고 dehydrate 한 상태를
// 반환한다. 페이지는 그 상태를 <HydrationBoundary> 로 Client 에 전달한다.
//
// nextjs-guide 의 prefetch 전략을 따른다.
// =============================================================================

import { QueryClient, dehydrate } from '@tanstack/react-query'
import { cache } from 'react'

/**
 * 요청 단위 QueryClient. React cache() 로 단일 RSC 렌더 내에서 재사용된다.
 */
export const getQueryClient = cache(() => new QueryClient())

/**
 * 전달받은 prefetch 함수들을 병렬 실행한 뒤 dehydrate 상태를 반환한다.
 *
 * @example
 * const state = await runPrefetch(tenantPrefetch.list(1))
 * return <HydrationBoundary state={state}><TenantsTable /></HydrationBoundary>
 */
export async function runPrefetch(
  ...prefetchers: Array<(qc: QueryClient) => Promise<void>>
) {
  const queryClient = getQueryClient()
  await Promise.all(prefetchers.map((fn) => fn(queryClient)))
  return dehydrate(queryClient)
}
