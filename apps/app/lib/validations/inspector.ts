import { z } from 'zod'

export const inspectorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '이름을 입력해주세요.')
    .max(100, '이름은 100자 이내로 입력해주세요.'),
  phone: z
    .string()
    .trim()
    // 하이픈 제거 후 검사 — 폼에서 formatPhone 포맷으로 입력되더라도 통과
    .transform((v) => v.replace(/-/g, ''))
    .pipe(
      z
        .string()
        .max(11, '전화번호는 11자리 이하여야 합니다.')
        .regex(/^\d*$/, '전화번호는 숫자만 입력 가능합니다.')
    )
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('올바른 이메일 형식이 아닙니다.')
    .optional()
    .or(z.literal('')),
})

export type InspectorInput = z.infer<typeof inspectorSchema>
