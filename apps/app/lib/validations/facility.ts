// =============================================================================
// spotcare.kr MVP — 시설 정보 Zod 검증 스키마
// =============================================================================
//
// Server Action 과 UI Form 이 공유한다.
//
// floor: UI 의 Select 에서 정수로 전달된다(generateFloorOptions 의 value).
//   지상 N층 → N, 지하 N층 → -N, 층 없음 → 0. 표시 변환은 floorToDisplay.
//   (UI 가 워크스페이스 범위 내 옵션만 노출하므로 여기서는 정수 여부만 검증)
// facility_type_id: 같은 워크스페이스/테넌트에 속한 타입이어야 한다.
//   소속 검증은 Server Action 에서 tenant_id + workspace_id 로 추가 확인한다.
// =============================================================================

import { z } from 'zod'

/**
 * 빈 문자열을 undefined 로 정규화하는 선택 텍스트 필드 헬퍼.
 * FormData 의 비어 있는 input 이 빈 문자열로 들어오는 것을 처리한다.
 */
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v))

/**
 * 시설 정보 생성/수정 입력 스키마.
 * workspace_id 는 액션 인자로 별도 전달된다.
 */
export const facilitySchema = z.object({
  facility_name: z
    .string()
    .trim()
    .min(1, '시설 이름을 입력해주세요.')
    .max(255, '시설 이름은 255자 이내로 입력해주세요.'),
  floor: z.coerce
    .number({ invalid_type_error: '층수는 숫자여야 합니다.' })
    .int('층수는 정수여야 합니다.'),
  facility_type_id: z
    .string()
    .uuid('올바른 시설 타입을 선택해주세요.'),
  memo: optionalText,
})

export type FacilityInput = z.infer<typeof facilitySchema>
