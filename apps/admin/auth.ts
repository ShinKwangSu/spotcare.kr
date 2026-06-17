// =============================================================================
// spotcare.kr Admin — NextAuth 인스턴스 (Node 런타임)
// =============================================================================
//
// Credentials Provider 의 authorize() 는 bcryptjs 와 Supabase 서버 클라이언트를
// 사용하므로 Node 런타임 전용이다. 따라서 Edge 호환 authConfig 에 이 파일에서
// providers 를 더해 최종 NextAuth 인스턴스를 만든다.
//
// 슈퍼어드민 인증은 admins 테이블을 service_role 클라이언트로 조회한다.
// admins 테이블은 RLS 미적용 + anon/authenticated 권한 회수 상태이므로,
// 반드시 service_role 키 클라이언트(@/lib/supabase/server 의 createClient)로
// 접근해야 한다(anon 키로는 0행 반환).
//
// Supabase 클라이언트는 @spotcare/database 의 서버 클라이언트를 사용한다.
// apps/admin tsconfig 의 path alias '@/lib/supabase/server' 가
// packages/database/src/supabase/server.ts 로 매핑되어 있다.
//
// export: handlers, auth, signIn, signOut
// =============================================================================

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // formData/JSON 어느 쪽으로 와도 처리 가능하도록 명시
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // service_role 클라이언트로 admins 조회(로그인 전이라 세션 컨텍스트 없음).
        // password_hash 는 서버에서만 SELECT — 클라이언트로 절대 반환하지 않는다.
        // admins.Row 타입이 AdminWithSecret(해시 포함)이므로 명시적 컬럼 지정으로
        // 의도치 않은 해시 노출을 한 번 더 차단한다.
        const supabase = createClient()
        const { data: admin, error } = await supabase
          .from('admins')
          .select('id, email, password_hash, name')
          .eq('email', email)
          .single()

        if (error || !admin) return null

        const passwordMatch = await bcrypt.compare(password, admin.password_hash)
        if (!passwordMatch) return null

        // 여기서 반환되는 객체가 jwt() 콜백의 user 로 전달된다.
        // password_hash 는 절대 포함하지 않는다(세션/토큰 누출 방지).
        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          adminId: admin.id, // jwt 콜백에서 token.adminId 로 적재됨
        }
      },
    }),
  ],
})
