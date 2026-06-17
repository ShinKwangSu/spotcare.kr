// =============================================================================
// spotcare.kr Admin — 경로 보호 미들웨어
// =============================================================================
//
// Edge 호환 authConfig 만으로 NextAuth 를 초기화한다.
// (auth.ts 의 Credentials Provider 는 bcryptjs/Supabase 등 Node 전용 의존성이
//  있어 Edge 미들웨어에서 사용할 수 없다. 미들웨어는 세션 토큰 검증만 하므로
//  provider 없이도 동작한다.)
//
// 경로 보호 규칙은 authConfig.callbacks.authorized 에 정의되어 있다.
//   - /dashboard 이하: 인증 필요(비로그인 → /login 리다이렉트)
//   - /login: 공개 접근(로그인 상태면 /dashboard 로 리다이렉트)
// =============================================================================

import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export const { auth: middleware } = NextAuth(authConfig)

export default middleware

export const config = {
  // 정적 자산/API 라우트/이미지 최적화는 미들웨어에서 제외.
  // (/login 은 authorized 콜백에서 처리하므로 matcher 에서 제외하지 않는다.)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
