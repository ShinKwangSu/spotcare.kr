'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'

import { signUpAction, type AuthActionState } from '@/app/actions/auth'
import { formatPhone, rawPhone } from '@/lib/utils/phone'
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

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.[0]) return null
  return <p className="text-sm text-destructive">{messages[0]}</p>
}

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    initialState
  )

  const [companyName, setCompanyName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>
            업체 마스터 계정을 생성합니다. 가입 후 자동으로 로그인됩니다.
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
              <Label htmlFor="company_name">업체명</Label>
              <Input
                id="company_name"
                name="company_name"
                placeholder="(주) 스팟케어"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                aria-invalid={!!state?.fieldErrors?.company_name}
              />
              <FieldError messages={state?.fieldErrors?.company_name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_name">관리자 이름</Label>
              <Input
                id="admin_name"
                name="admin_name"
                placeholder="홍길동"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                aria-invalid={!!state?.fieldErrors?.admin_name}
              />
              <FieldError messages={state?.fieldErrors?.admin_name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              {/* 서버에는 하이픈 없는 숫자만 전달 */}
              <input type="hidden" name="phone" value={rawPhone(phone)} />
              <Input
                id="phone"
                type="text"
                inputMode="numeric"
                placeholder="010-0000-0000"
                required
                maxLength={13}
                value={phone}
                onChange={handlePhoneChange}
                aria-invalid={!!state?.fieldErrors?.phone}
              />
              <FieldError messages={state?.fieldErrors?.phone} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!state?.fieldErrors?.email}
              />
              <FieldError messages={state?.fieldErrors?.email} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!state?.fieldErrors?.password}
              />
              <FieldError messages={state?.fieldErrors?.password} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '가입 중...' : '회원가입'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                로그인
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
