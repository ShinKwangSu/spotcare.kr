// =============================================================================
// 내 비밀번호 변경 페이지
// =============================================================================
// Server Component 셸 + Client 폼. 데이터 prefetch 불필요(개인화 액션).
// =============================================================================

import { ChangePasswordForm } from '@/components/change-password-form'

export default function ChangePasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">비밀번호 변경</h1>
        <p className="text-sm text-muted-foreground">
          비밀번호 변경 후 보안을 위해 다시 로그인해야 합니다.
        </p>
      </div>

      <ChangePasswordForm />
    </div>
  )
}
