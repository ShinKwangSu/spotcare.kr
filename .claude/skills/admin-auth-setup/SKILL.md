---
name: admin-auth-setup
description: spotcare.kr apps/admin 슈퍼어드민 인증 가이드. Auth.js v5 + Supabase 통합, admins 테이블 기반 Credentials Provider, 미들웨어 경로 보호, 세션 JWT에 adminId/role 포함 처리. Auth Engineer 에이전트가 apps/admin 인증 구현 시 반드시 이 스킬을 사용한다.
---

# Admin Auth Setup — apps/admin 슈퍼어드민 인증

## 대상 앱 및 파일 경로

**타겟 앱:** `apps/admin`

```
apps/admin/
├── auth.config.ts        — Auth.js 설정 (admins 테이블 기반)
├── auth.ts               — NextAuth 인스턴스 export
├── middleware.ts         — 경로 보호
└── app/
    └── actions/
        └── auth.ts       — 로그인/로그아웃 Server Action
```

> 슈퍼어드민 계정은 회원가입 플로우 없이 DB 직접 등록(초기 시딩)으로 관리한다.

## admins 테이블

```sql
-- supabase/migrations/에 추가 (db-schema 스킬과 함께 관리)
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

## auth.config.ts 패턴

```typescript
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createClient } from '@spotcare/database'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isDashboard = nextUrl.pathname.startsWith('/dashboard')
      if (isDashboard && !isLoggedIn) return false
      return true
    },
    jwt({ token, user }) {
      // 세션 JWT에 adminId 포함
      if (user) {
        token.adminId = (user as any).adminId
      }
      return token
    },
    session({ session, token }) {
      if (token.adminId) {
        (session.user as any).adminId = token.adminId
      }
      return session
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const supabase = createClient()
        const { data: admin } = await supabase
          .from('admins')
          .select('id, email, password_hash, name')
          .eq('email', parsed.data.email)
          .single()

        if (!admin) return null
        const passwordMatch = await bcrypt.compare(parsed.data.password, admin.password_hash)
        if (!passwordMatch) return null

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          adminId: admin.id,
        }
      },
    }),
  ],
}
```

## middleware.ts

```typescript
import { auth } from '@/auth'

export default auth

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
}
```

## Server Action에서 adminId 접근

```typescript
import { auth } from '@/auth'

export async function someAdminAction() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const adminId = (session.user as any).adminId
  // 슈퍼어드민은 모든 데이터에 접근 가능 — tenant_id 필터 불필요
}
```

## 체크리스트

- [ ] `bcryptjs`로 비밀번호 해싱 (평문 저장 금지)
- [ ] JWT callback에서 `adminId` 추가
- [ ] session callback에서 `adminId` 노출
- [ ] middleware가 `/dashboard` 경로 보호
- [ ] `/login`은 공개 접근 가능
- [ ] Supabase 클라이언트를 `@spotcare/database`에서 import
- [ ] `admins` 테이블 마이그레이션 SQL 생성 (db-schema 스킬과 함께)
