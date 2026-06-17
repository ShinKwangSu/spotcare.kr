'use server'

// =============================================================================
// spotcare.kr Admin — 인증 Server Action (로그인 / 로그아웃)
// =============================================================================
//
// 슈퍼어드민은 회원가입 플로우가 없다. 계정은 시딩/수동 발급으로만 생성된다.
// 따라서 이 파일은 로그인/로그아웃만 제공한다.
//
// - 비밀번호 검증/해싱은 auth.ts 의 Credentials authorize() 에서 수행한다
//   (bcrypt.compare). 이 파일은 signIn/signOut 트리거만 담당한다.
// - 로그인 성공 시 /dashboard 로 redirect 한다.
// =============================================================================

import { z } from 'zod'
import { AuthError } from 'next-auth'
import { signIn, signOut } from '@/auth'

export type AuthActionState = {
  success: boolean
  error?: string
  // 필드별 검증 오류(폼 인라인 표시용)
  fieldErrors?: Record<string, string[]>
}

// -----------------------------------------------------------------------------
// 로그인
// -----------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().trim().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

/**
 * 로그인 Server Action.
 * useActionState(loginAction, initialState) 또는 form action 으로 사용한다.
 * 성공 시 /dashboard 로 redirect 된다.
 */
export async function loginAction(
  _prevState: AuthActionState | undefined,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      success: false,
      error: '입력값을 확인해주세요.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    })
  } catch (err) {
    // signIn 의 redirect 예외는 상위로 다시 던져 실제 리다이렉트가 일어나게 한다.
    if (isRedirectError(err)) throw err
    if (err instanceof AuthError) {
      // CredentialsSignin = 이메일/비밀번호 불일치
      return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
    }
    return { success: false, error: '로그인 중 오류가 발생했습니다.' }
  }

  return { success: true }
}

// -----------------------------------------------------------------------------
// 로그아웃
// -----------------------------------------------------------------------------

/**
 * 로그아웃 Server Action. 세션 종료 후 /login 으로 redirect 한다.
 */
export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}

// -----------------------------------------------------------------------------
// 내부 유틸
// -----------------------------------------------------------------------------

/**
 * Next.js redirect()/signIn redirect 는 NEXT_REDIRECT 라는 특수 예외를 던진다.
 * 이를 일반 에러로 잡아버리면 리다이렉트가 동작하지 않으므로 식별해 재던진다.
 */
function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}
