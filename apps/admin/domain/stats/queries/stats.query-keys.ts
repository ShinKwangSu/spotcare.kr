// =============================================================================
// stats 도메인 — Query Keys
// =============================================================================

export const statsQueryKeys = {
  all: ['stats'] as const,
  dashboard: () => [...statsQueryKeys.all, 'dashboard'] as const,
}
