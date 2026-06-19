import { z } from 'zod'

export const checklistItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  item_name: z
    .string()
    .trim()
    .min(1, '항목명을 입력해주세요.')
    .max(255, '항목명은 255자 이내로 입력해주세요.'),
  response_type: z.enum(['checklist', 'photo']).default('checklist'),
  is_required: z.boolean().default(false),
})

export type ChecklistItemInput = z.infer<typeof checklistItemInputSchema>

export const checklistSchema = z.object({
  checklist_name: z
    .string()
    .trim()
    .min(1, '점검표명을 입력해주세요.')
    .max(255, '점검표명은 255자 이내로 입력해주세요.'),
  description: z.string().trim().optional(),
  repeat_cycle: z.enum(['daily', 'weekly', 'monthly'], {
    required_error: '반복 주기를 선택해주세요.',
  }),
  count: z.coerce
    .number({ invalid_type_error: '횟수를 입력해주세요.' })
    .int()
    .min(1, '1 이상 입력해주세요.'),
  days: z.array(z.coerce.number().int().min(0).max(6)).optional(),
  items: z
    .array(checklistItemInputSchema)
    .min(1, '항목을 하나 이상 추가해주세요.'),
})

export type ChecklistInput = z.infer<typeof checklistSchema>
