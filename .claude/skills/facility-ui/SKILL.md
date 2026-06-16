---
name: facility-ui
description: spotcare.kr apps/app shadcn/ui + Tailwind CSS 어드민 UI 구현 가이드. 회원가입/로그인 폼, 워크스페이스 목록/생성 Dialog, 시설 타입 CRUD, 시설 정보 Table + 층수 Select 드롭다운. UI Engineer 에이전트가 apps/app 화면 구현 시 반드시 이 스킬을 사용한다. '화면', 'UI', '컴포넌트', '페이지', 'Dialog', 'Table', 'Select', '폼' 구현 시 트리거.
---

# Facility UI — apps/app shadcn/ui + Tailwind CSS

## 대상 앱 및 파일 경로

**타겟 앱:** `apps/app`

```
apps/app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── dashboard/
│       ├── layout.tsx              — 사이드바 포함 레이아웃
│       ├── workspaces/
│       │   └── page.tsx            — 워크스페이스 목록 + 생성
│       └── [workspaceId]/
│           ├── facility-types/
│           │   └── page.tsx        — 시설 타입 CRUD
│           └── facilities/
│               └── page.tsx        — 시설 정보 CRUD
└── components/                     — 재사용 컴포넌트
```

## Import 규칙

```typescript
// UI 컴포넌트 — @spotcare/ui에서 import
import { Button } from '@spotcare/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@spotcare/ui'
import { Input } from '@spotcare/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@spotcare/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@spotcare/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spotcare/ui'

// 층수 변환 유틸 — @spotcare/database에서 import
import { generateFloorOptions, floorToDisplay } from '@spotcare/database'

// Server Actions — @/ alias (apps/app 내부)
import { signUpAction } from '@/app/actions/auth'
import { createWorkspace } from '@/app/actions/workspace'
```

## 회원가입 폼 패턴

```typescript
// apps/app/app/(auth)/signup/page.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@spotcare/ui'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@spotcare/ui'
import { Input } from '@spotcare/ui'
import { Button } from '@spotcare/ui'
import { signUpAction } from '@/app/actions/auth'

// 필드: 업체명(company_name), 관리자 이름(admin_name), 전화번호(phone), 이메일(email), 비밀번호(password)
// Card > CardHeader(제목) > CardContent > Form > FormField 패턴
// 제출 버튼: useFormStatus로 pending 상태 처리
```

## 워크스페이스 생성 Dialog

```typescript
// 지상 층수: "지상 [ 10 ] 층" 형태의 Input (숫자 입력, 0 이상)
// 지하 층수: "지하 [ 2 ] 층" 형태의 Input (숫자 입력, 0 이상 — 백엔드에서 음수 변환)
// shadcn/ui Dialog > DialogContent > Form 구조

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@spotcare/ui'

// [워크스페이스 추가] 버튼 → Dialog 오픈 → 폼 제출 → revalidatePath로 목록 갱신
```

## 층수 Select 드롭다운 패턴

```typescript
import { generateFloorOptions } from '@spotcare/database'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@spotcare/ui'

// workspace의 max_floor, min_floor로 옵션 생성
const floorOptions = generateFloorOptions(workspace.max_floor, workspace.min_floor)

// Select 컴포넌트로 렌더링
<Select onValueChange={(val) => field.onChange(Number(val))}>
  <SelectTrigger>
    <SelectValue placeholder="층 선택" />
  </SelectTrigger>
  <SelectContent>
    {floorOptions.map((opt) => (
      <SelectItem key={opt.value} value={String(opt.value)}>
        {opt.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// 직접 숫자 Input은 사용하지 않는다 — 오입력 방지
```

## 시설 정보 Table

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spotcare/ui'
import { floorToDisplay } from '@spotcare/database'

// 컬럼: 시설명 | 층수(표시용) | 시설 타입 | 위치 설명 | 비고 | 액션
// floor 컬럼: DB에서 정수로 가져와 floorToDisplay()로 변환하여 표시
// 정렬: floor 컬럼으로 오름차순/내림차순 SQL ORDER BY 가능 (추가 연산 불필요)
```

## 시설 정보 등록 폼 필드

| 필드 | 컴포넌트 | 입력 방식 |
|------|---------|---------|
| 시설명 | `Input` | 자유 텍스트 |
| 층 수 | `Select` | `generateFloorOptions()` 드롭다운 |
| 시설 타입 | `Select` | `getFacilityTypes(workspaceId)` 드롭다운 |
| 위치 설명 | `Textarea` | 자유 텍스트 (선택) |
| 비고 | `Textarea` | 자유 텍스트 (선택) |

## 에러/로딩 피드백

```typescript
// Server Action 결과 처리
const [state, formAction, isPending] = useActionState(createWorkspace, null)

// 로딩 중 버튼
<Button type="submit" disabled={isPending}>
  {isPending ? '저장 중...' : '저장'}
</Button>

// 에러 표시
{state?.error && (
  <p className="text-sm text-destructive">{state.error}</p>
)}
```

## 체크리스트

- [ ] UI 컴포넌트를 `@spotcare/ui`에서 import (직접 구현 금지)
- [ ] 층수 유틸을 `@spotcare/database`에서 import
- [ ] 층수 입력은 항상 `Select` + `generateFloorOptions()` 사용 (직접 Input 금지)
- [ ] `floorToDisplay()`로 Table에 층수 표시
- [ ] 폼은 `react-hook-form` + `zod` 검증
- [ ] `isPending`으로 로딩 중 버튼 비활성화
- [ ] Server Action 에러 시 사용자에게 메시지 표시
- [ ] `md` 이상 화면에 Table 최적화
