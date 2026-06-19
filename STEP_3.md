# [MVP 핵심 개발 기획안] 민원 관리 (Phase 3)

## 1. 프로젝트 개요

- **목적:** 시설 방문자가 QR 코드로 진입한 `/inspect/[facilityId]` 페이지에서 로그인 없이 불편 사항·의견을 간편하게 제출하고, 테넌트 어드민(`apps/app`)이 접수된 민원을 시설별로 확인할 수 있는 민원 관리 기능 구축.
- **핵심 흐름:** `민원 접수(방문자, 비로그인)` → `시설별 민원 내역 확인(테넌트 어드민)` → `처리 완료 표시`
- **기존 기능과의 연계:** Phase 1·2의 `workspaces`, `facilities` 구조를 그대로 활용. 점검이력(`FacilityInspectionHistory`) 패턴과 동일하게 시설별로 민원 이력을 Sheet 사이드바로 표시.

## 2. 기술 스택 (Tech Stack)

- **Framework:** Next.js App Router (`apps/app`)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Auth.js — 민원 접수 페이지(`/inspect/[facilityId]`)는 기존과 동일하게 **비로그인(Public) 접근** 허용
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (`Sheet`, `Dialog`, `Badge`, `Button`, `Textarea`, `Select`)
- **파일 저장:** Supabase Storage (민원 첨부 사진, 기존 점검 사진과 동일한 버킷 정책 활용)
- **공유 패키지:** `@spotcare/database` (타입/클라이언트), `@spotcare/ui` (shadcn 컴포넌트)

---

## 3. 민원 접수 UX (방문자용, 비로그인)

방문자는 기존 QR 코드를 스캔해 `/inspect/[facilityId]` 페이지로 진입한다. **별도 민원 전용 URL 없이**, 기존 점검 상태 페이지 하단에 민원 접수 진입점을 추가한다.

### 접수 흐름

```
/inspect/[facilityId] 페이지 하단
  └─ "민원 접수" 버튼 클릭
       └─ 민원 접수 모달(Dialog) 열림
            ├─ ① 민원 유형 선택 (Select, 필수)
            ├─ ② 내용 입력 (Textarea, 필수)
            ├─ ③ 사진 첨부 (선택, 최대 3장)
            └─ ④ 접수 버튼 → 완료 안내 후 모달 닫힘
```

### 입력 항목

| 항목 | 필수 여부 | 비고 |
|------|----------|------|
| 민원 유형 | 필수 | 고정 4종 Select, 미선택 시 접수 불가 |
| 내용 | 필수 | Textarea, 빈 값 접수 불가 |
| 사진 | 선택 | 최대 3장, Supabase Storage 업로드 |

### 민원 유형 고정값

민원 유형은 관리자가 설정하는 것이 아닌 서비스 전체 고정값이다. 별도 DB 테이블 없이 앱 레이어에서 상수로 관리한다.

| 값 | 표시 라벨 |
|----|----------|
| `시설_고장` | 시설 고장 |
| `청소_요청` | 청소 요청 |
| `안전_문제` | 안전 문제 |
| `직접입력` | 직접 입력 |

**"직접 입력" 선택 시 UX:** Select에서 "직접 입력"을 선택하면 유형명을 직접 작성하는 텍스트 필드가 노출된다. 이 필드도 빈 값이면 접수 불가.

### UI 배치 — `/inspect/[facilityId]` 페이지 변경

현재 페이지 구조에서 점검 항목 섹션 아래에 구분선과 민원 접수 버튼을 추가한다.

```
[시설명 + 점검하기 버튼]
[점검 통계 (오늘/이번주/이번달)]
[마지막 점검]
[점검 항목 목록]
─────────────────────────  ← 구분선 추가
[민원 접수 버튼]            ← 신규 추가
```

---

## 4. 백엔드 데이터 구조 (Database Schema)

민원 유형은 고정값이므로 별도 테이블 없음. `complaints` 테이블 하나만 추가한다. PK는 UUID, 기존 `facilities` 테이블과 FK 연결. CLAUDE.md 소프트 딜리트 컨벤션 적용.

### complaints — 민원

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `facility_id` | UUID FK | facilities.id |
| `workspace_id` | UUID FK | workspaces.id (격리 키 이중화) |
| `tenant_id` | UUID FK | tenants.id (격리 키) |
| `complaint_type` | VARCHAR(100) | 민원 유형 문자열 (고정값 또는 직접입력 텍스트) |
| `content` | TEXT | 민원 내용 (필수, NOT NULL) |
| `photo_urls` | TEXT[] | 첨부 사진 URL 배열 (기본값 `{}`) |
| `status` | ENUM | `received`(접수) / `in_progress`(처리중) / `resolved`(완료) |
| `created_at` | TIMESTAMPTZ | 접수 시각 |
| `resolved_at` | TIMESTAMPTZ NULL | 처리 완료 시각 |
| `deleted_at` | TIMESTAMPTZ | 소프트 딜리트, NULL = 활성 |

> `complaint_type`을 ENUM이 아닌 VARCHAR로 저장하는 이유: "직접 입력" 선택 시 사용자가 타이핑한 임의 문자열을 그대로 저장해야 하기 때문. 유형값 유효성 검사는 앱 레이어(Server Action)에서 처리한다.

**RLS:**
- `INSERT`: anon 역할 허용 (비로그인 방문자 제출)
- `SELECT`, `UPDATE`: 인증된 테넌트(`app_current_tenant_id()`)만 허용, `tenant_id` 격리

### 마이그레이션 패턴

```sql
CREATE TYPE complaint_status AS ENUM ('received', 'in_progress', 'resolved');

CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  complaint_type VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  status complaint_status NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_complaints_active ON complaints (tenant_id, facility_id) WHERE deleted_at IS NULL;
```

### TypeScript 타입 추가 (`packages/database/src/types/database.ts`)

```typescript
/** 앱 레이어 상수 — DB 테이블 없음 */
export const COMPLAINT_TYPE_OPTIONS = [
  { value: '시설_고장', label: '시설 고장' },
  { value: '청소_요청', label: '청소 요청' },
  { value: '안전_문제', label: '안전 문제' },
  { value: '직접입력', label: '직접 입력' },
] as const

export type ComplaintTypeValue = typeof COMPLAINT_TYPE_OPTIONS[number]['value']

export type Complaint = {
  id: string
  facility_id: string
  workspace_id: string
  tenant_id: string
  complaint_type: string
  content: string
  photo_urls: string[]
  status: 'received' | 'in_progress' | 'resolved'
  created_at: string
  resolved_at: string | null
  deleted_at?: string | null
}

export type ComplaintInsert = {
  id?: string
  facility_id: string
  workspace_id: string
  tenant_id: string
  complaint_type: string
  content: string
  photo_urls?: string[]
  status?: 'received' | 'in_progress' | 'resolved'
  created_at?: string
  resolved_at?: string | null
  deleted_at?: string | null
}
```

---

## 5. 어드민(`apps/app`) 주요 기능 및 UI 동선

민원 유형은 고정값이므로 **별도 유형 관리 메뉴 없음**. 시설별 민원 이력 확인 기능만 추가한다.

### 시설별 민원 이력 확인

- 위치: `/dashboard/[workspaceId]/facilities` (기존 시설 관리 페이지)
- 기존 `FacilityInspectionHistory` 컴포넌트(점검이력 Sheet)와 동일한 패턴으로 `FacilityComplaintHistory` 컴포넌트를 추가.
- 시설 목록 각 행 액션 영역에 "민원이력" 버튼 추가 → 클릭 시 Sheet 사이드바 열림.
- **Sheet 내 목록:** 접수일, 유형, 내용 미리보기, 상태 Badge 표시.
- **Sheet 내 상세:** 전체 내용, 첨부 사진(라이트박스), 상태 변경(접수 → 처리중 → 완료).

```
[시설 목록 테이블]
  └─ 각 행 액션 영역: [점검이력 버튼] [민원이력 버튼] [수정] [삭제]
                                         ↓
                              [민원이력 Sheet]
                                ├─ 민원 목록 (날짜, 유형, 상태 Badge)
                                └─ 민원 상세
                                     ├─ 유형 + 내용 + 사진
                                     └─ 상태 변경 버튼
```

---

## 6. 기존 기능과의 연계

- **`/inspect/[facilityId]` 페이지:** 비로그인 공개 접근 정책 그대로 유지. 민원 접수는 기존 점검 흐름과 독립적으로 동작.
- **점검이력 Sheet 패턴:** `FacilityInspectionHistory` → `FacilityComplaintHistory`로 동일한 컴포넌트 구조 재사용.
- **사진 업로드:** 기존 점검 사진(`inspection` 도메인 actions)과 동일한 Supabase Storage API 호출 방식 사용.
- **슈퍼어드민(`apps/admin`):** MVP 범위 외. 추후 대시보드 통계 카드에 "총 민원 수" 추가 고려.

---

## 7. 구현 파이프라인

```
db-architect
  → complaints 테이블 마이그레이션 (RLS 정책 포함)
  → packages/database/src/types/database.ts 타입 + COMPLAINT_TYPE_OPTIONS 상수 추가

backend-engineer (apps/app)
  → app/actions/complaint.ts
      - submitComplaint(facilityId, data) — anon 허용, complaint_type/content 빈값 차단
      - getComplaints(facilityId) — 테넌트 인증
      - updateComplaintStatus(complaintId, status) — 테넌트 인증

ui-engineer (apps/app)
  → components/complaint-form-dialog.tsx
      - COMPLAINT_TYPE_OPTIONS Select
      - "직접 입력" 선택 시 추가 텍스트 필드 노출
      - 유형·내용 미입력 시 접수 버튼 비활성화
  → components/facility-complaint-history.tsx (facility-inspection-history 패턴 재사용)
  → app/inspect/[facilityId]/page.tsx 수정 — 점검 항목 아래 구분선 + 민원 접수 버튼 + 모달 연결

qa-engineer
  → 비로그인 제출 보안 (anon INSERT만 허용, SELECT/UPDATE 차단)
  → 유형·내용 빈값 제출 차단 검증 (앱 레이어 + DB NOT NULL)
  → tenant_id + workspace_id 데이터 격리
  → 상태 전이 정합성 (received → in_progress → resolved)
  → 소프트 딜리트 적용 여부 (complaints)
```
