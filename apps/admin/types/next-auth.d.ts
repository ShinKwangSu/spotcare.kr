// =============================================================================
// spotcare.kr Admin — Auth.js 타입 확장
// =============================================================================
//
// Auth.js 의 Session / User / JWT 에 슈퍼어드민 식별자인 adminId 를 추가한다.
// 이 선언 덕분에 Server Action 에서 session.user.adminId 를 any 캐스팅 없이
// 타입 안전하게 사용할 수 있다.
//
// 슈퍼어드민은 테넌트 격리 대상이 아니므로 tenantId 가 없다(전역 접근).
// =============================================================================

import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      adminId: string
    } & DefaultSession['user']
  }

  // authorize() 가 반환하는 user 객체 형태
  interface User {
    adminId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    adminId?: string
  }
}
