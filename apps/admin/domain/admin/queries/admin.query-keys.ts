// =============================================================================
// admin 도메인 — Query Keys
// =============================================================================
// 인라인 query key 금지. 모든 키는 이 팩토리를 통해 생성한다.
// =============================================================================

export const adminQueryKeys = {
  all: ['admins'] as const,
  list: (page: number) => [...adminQueryKeys.all, 'list', { page }] as const,
  detail: (adminId: string) =>
    [...adminQueryKeys.all, 'detail', adminId] as const,
}
