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
    .regex(/^\d{0,11}$/, '숫자만 입력해주세요(최대 11자리).')
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
