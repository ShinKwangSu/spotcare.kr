// =============================================================================
// spotcare.kr MVP — 워크스페이스 Zod 검증 스키마
// =============================================================================
//
// Server Action 과 UI Form 이 공유한다.
//
// 층수 입력 규약(UI 계약):
//   - max_floor: 지상 최고 층. 0 이상의 정수(양수). DB CHECK: max_floor >= 0.
//   - min_floor: 지하 최저 층. UI 에서는 "양수"로 입력받는다(예: 지하 2층 → 2).
//       Server Action 에서 음수로 변환해 저장한다(DB CHECK: min_floor <= 0).
//       0 이면 지하 없음.
// =============================================================================

import { z } from 'zod'

/**
 * 워크스페이스 생성/수정 입력 스키마.
 * z.coerce 로 FormData 의 문자열을 숫자로 변환한다.
 */
export const workspaceSchema = z.object({
  workspace_name: z
    .string()
    .trim()
    .min(1, '워크스페이스 이름을 입력해주세요.')
    .max(255, '워크스페이스 이름은 255자 이내로 입력해주세요.'),
  max_floor: z.coerce
    .number({ invalid_type_error: '지상 최고 층은 숫자여야 합니다.' })
    .int('지상 최고 층은 정수여야 합니다.')
    .min(0, '지상 최고 층은 0 이상이어야 합니다.')
    .max(200, '지상 최고 층이 너무 큽니다.'),
  // UI 입력은 지하 깊이를 "양수"로 받는다(0 = 지하 없음).
  // Server Action 에서 음수(-min_floor)로 변환하여 저장한다.
  min_floor: z.coerce
    .number({ invalid_type_error: '지하 최저 층은 숫자여야 합니다.' })
    .int('지하 최저 층은 정수여야 합니다.')
    .min(0, '지하 깊이는 0 이상의 값으로 입력해주세요.')
    .max(50, '지하 최저 층이 너무 깊습니다.'),
  address: z.string().max(255).nullable().optional(),
  address_detail: z.string().max(255).nullable().optional(),
})

export type WorkspaceInput = z.infer<typeof workspaceSchema>
