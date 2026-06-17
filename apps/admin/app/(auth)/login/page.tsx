'use client'

// =============================================================================
// spotcare 관리자 포털 — 로그인 페이지
// =============================================================================
// loginAction(prevState, formData) 를 useActionState 로 연결한다.
// 성공 시 액션 내부에서 /dashboard 로 redirect(NEXT_REDIRECT) 되므로
// 클라이언트에서 별도 라우팅 처리를 하지 않는다.
// 슈퍼어드민은 회원가입이 없으므로 회원가입 링크를 두지 않는다.
// =============================================================================

import { useActionState } from 'react'

import { loginAction, type AuthActionState } from '@/app/actions/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@spotcare/ui/components/card'
import { Button } from '@spotcare/ui/components/button'
import { Input } from '@spotcare/ui/components/input'
import { Label } from '@spotcare/ui/components/label'

const initialState: AuthActionState = { success: false }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">spotcare 관리자 포털</CardTitle>
          <CardDescription>
            슈퍼어드민 계정으로 로그인하세요.
          </CardDescription>
        </CardHeader>

        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@spotcare.kr"
                required
                aria-invalid={!!state?.fieldErrors?.email}
              />
              {state?.fieldErrors?.email?.[0] && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.email[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                aria-invalid={!!state?.fieldErrors?.password}
              />
              {state?.fieldErrors?.password?.[0] && (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.password[0]}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '로그인 중...' : '로그인'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
