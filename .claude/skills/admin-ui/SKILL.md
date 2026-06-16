---
name: admin-ui
description: spotcare.kr apps/admin 슈퍼어드민 UI 구현 가이드. 로그인, 테넌트 목록/상세, 운영 통계 화면. UI Engineer 에이전트가 apps/admin 화면 구현 시 반드시 이 스킬을 사용한다.
---

# Admin UI — apps/admin 슈퍼어드민 화면

## 대상 앱 및 파일 경로

**타겟 앱:** `apps/admin`

```
apps/admin/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          — 슈퍼어드민 로그인
│   └── dashboard/
│       ├── layout.tsx            — 사이드바 포함 레이아웃
│       ├── page.tsx              — 운영 통계 대시보드
│       ├── tenants/
│       │   ├── page.tsx          — 테넌트 목록 (Table + 검색)
│       │   └── [tenantId]/
│       │       └── page.tsx      — 테넌트 상세 (워크스페이스 목록 포함)
│       └── settings/
│           └── page.tsx          — 서비스 정책 관리 (향후 확장)
└── components/                   — 재사용 컴포넌트
```

## Import 규칙

```typescript
// UI 컴포넌트 — @spotcare/ui에서 import
import { Button } from '@spotcare/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spotcare/ui'
import { Badge } from '@spotcare/ui'
import { Input } from '@spotcare/ui'

// Server Actions — @/ alias (apps/admin 내부)
import { getTenants } from '@/app/actions/tenant'
import { getServiceStats } from '@/app/actions/stats'
```

## 운영 통계 대시보드 (`dashboard/page.tsx`)

```typescript
// 서버 컴포넌트 — 통계 데이터를 직접 fetch
import { getServiceStats } from '@/app/actions/stats'
import { Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'

export default async function DashboardPage() {
  const stats = await getServiceStats()

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>총 업체 수</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.tenantCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>총 워크스페이스 수</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.workspaceCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>총 시설 수</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.facilityCount}</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

## 테넌트 목록 (`dashboard/tenants/page.tsx`)

```typescript
// 컬럼: 업체명 | 관리자명 | 이메일 | 전화번호 | 가입일 | 워크스페이스 수 | 상세보기
// 검색: 업체명/이메일로 클라이언트 사이드 필터 또는 서버 사이드 쿼리
// 페이지네이션: 20개 단위

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spotcare/ui'
import { getTenants } from '@/app/actions/tenant'

export default async function TenantsPage() {
  const { data: tenants, total } = await getTenants()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">업체 목록 ({total})</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>업체명</TableHead>
            <TableHead>관리자명</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead>가입일</TableHead>
            <TableHead>상세</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell>{tenant.company_name}</TableCell>
              <TableCell>{tenant.admin_name}</TableCell>
              <TableCell>{tenant.email}</TableCell>
              <TableCell>{new Date(tenant.created_at).toLocaleDateString('ko-KR')}</TableCell>
              <TableCell>
                <a href={`/dashboard/tenants/${tenant.id}`}>보기</a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

## 테넌트 상세 (`dashboard/tenants/[tenantId]/page.tsx`)

```typescript
// 테넌트 기본 정보 Card + 하위 워크스페이스 목록 Table
// 워크스페이스별 시설 타입 수, 시설 수 표시 (향후 확장)
import { getTenantDetail } from '@/app/actions/tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spotcare/ui'
```

## 사이드바 네비게이션 구조

```typescript
// apps/admin/app/dashboard/layout.tsx
// 좌측 사이드바 메뉴:
// - 대시보드 (운영 통계)
// - 업체 관리 (테넌트 목록)
// - 설정 (정책 관리, 향후 확장)
```

## 로그인 페이지 (`(auth)/login/page.tsx`)

```typescript
// apps/app의 로그인 폼과 동일한 패턴 사용
// Card + Form + Input(이메일, 비밀번호) + Button
// 회원가입 링크 없음 (슈퍼어드민은 DB 직접 등록)
import { Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'
import { Input } from '@spotcare/ui'
import { Button } from '@spotcare/ui'
import { loginAction } from '@/app/actions/auth'
```

## 체크리스트

- [ ] UI 컴포넌트를 `@spotcare/ui`에서 import (직접 구현 금지)
- [ ] 테넌트 목록에 페이지네이션 적용
- [ ] 로그인 페이지에 회원가입 링크 없음
- [ ] 대시보드 통계 카드 구현
- [ ] `isPending`으로 로딩 중 버튼 비활성화
- [ ] `md` 이상 화면에 Table 최적화
