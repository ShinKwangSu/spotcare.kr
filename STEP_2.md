# [MVP 핵심 개발 기획안] 슈퍼어드민 서비스 (Phase 2)

## 1. 프로젝트 개요

- **목적:** spotcare.kr 서비스를 운영·관리하는 내부 슈퍼어드민 포털 구축. 어드민 계정 및 테넌트(가입 업체) 데이터를 통합 관리한다.
- **타겟 앱:** `apps/admin` (모노레포 내 독립 Next.js 앱)
- **접근 권한:** 슈퍼어드민 계정만 접근 가능. 테넌트 회원가입 경로 없음 — 모든 어드민 계정은 내부에서 직접 생성한다.
- **UI 구조:** `apps/app`과 동일하게 사이드바(Sidebar)를 포함한 Dashboard 레이아웃으로 구성.

---

## 2. 기술 스택

- **Framework:** Next.js App Router (`apps/admin`)
- **Database:** Supabase (PostgreSQL) — `@spotcare/database` 공유 패키지
- **Authentication:** Auth.js v5 (Credentials Provider, `admins` 테이블 기반)
- **Styling:** Tailwind CSS + shadcn/ui (`@spotcare/ui` 공유 패키지)
- **상태 관리:** React Query (TanStack Query) + nuqs (URL 상태)

---

## 3. DB 스키마 추가

### ① admins 테이블

```sql
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 슈퍼어드민 시딩 (비밀번호: 1q2w#E$R, bcrypt 해싱 필요)
INSERT INTO admins (email, password_hash, name)
VALUES ('admin@spotcare.kr', '<bcrypt_hash>', '관리자');
```

- 회원가입 없음 — 어드민 계정은 슈퍼어드민이 직접 생성
- 초기 계정: **이메일 `admin@spotcare.kr` / 비밀번호 `1q2w#E$R` / 이름 `관리자`**
- 신규 어드민 생성 시 임시 비밀번호: `12341234` (bcrypt 해싱 후 저장)

---

## 4. 인증 (Auth)

### 로그인

- **경로:** `/login`
- Auth.js Credentials Provider + `admins` 테이블 이메일/비밀번호 검증
- 회원가입 링크 없음
- 로그인 성공 시 `/dashboard`로 리다이렉트
- 세션 JWT에 `adminId` 포함

### 미들웨어

- `/dashboard/**` 경로 전체 보호 — 미인증 시 `/login`으로 리다이렉트
- `/login`은 공개 접근 허용

---

## 5. UI 구조 및 라우트

```
apps/admin/app/
├── (auth)/
│   └── login/
│       └── page.tsx              — 슈퍼어드민 로그인
└── dashboard/
    ├── layout.tsx                — 사이드바 포함 레이아웃 (apps/app과 동일 구조)
    ├── page.tsx                  — 홈 (어드민/테넌트 카운트 통계 카드)
    ├── admins/
    │   ├── page.tsx              — 어드민 목록 (Table + 페이지네이션)
    │   ├── [adminId]/
    │   │   └── page.tsx          — 어드민 상세/수정
    │   └── password/
    │       └── page.tsx          — 내 비밀번호 변경
    └── tenants/
        ├── page.tsx              — 테넌트 목록 (Table + 검색 + 페이지네이션)
        └── [tenantId]/
            └── page.tsx          — 테넌트 상세/수정 (워크스페이스 목록 포함)
```

### 사이드바 메뉴 구성

| 메뉴 | 경로 | 아이콘 |
|------|------|--------|
| 대시보드 | `/dashboard` | LayoutDashboard |
| 어드민 관리 | `/dashboard/admins` | ShieldUser |
| 테넌트 관리 | `/dashboard/tenants` | Building2 |

---

## 6. 어드민 관리 페이지

### 목록 (`/dashboard/admins`)

- shadcn/ui `Table` 컴포넌트로 목록 표시
- **컬럼:** 이름, 이메일, 생성일, 액션(수정 / 삭제)
- 페이지네이션: 20건 단위, URL 파라미터(`?page=1`)로 상태 관리 (nuqs)
- [어드민 추가] 버튼 → Dialog(모달)로 생성 폼 노출

### 어드민 생성 (Dialog)

- **입력 필드:** 이름, 이메일
- **임시 비밀번호:** `12341234` 고정 (서버에서 bcrypt 해싱 후 저장)
- 생성 후 목록 자동 갱신 (React Query invalidation)

### 어드민 수정 (`/dashboard/admins/[adminId]`)

- **수정 가능 필드:** 이름, 이메일
- 비밀번호는 이 페이지에서 수정 불가 — 별도 비밀번호 변경 페이지 사용

### 어드민 삭제

- 목록에서 삭제 버튼 클릭 → shadcn/ui `AlertDialog`로 확인 후 삭제
- 현재 로그인 중인 본인 계정은 삭제 불가

### 비밀번호 변경 (`/dashboard/admins/password`)

- 현재 비밀번호, 새 비밀번호, 새 비밀번호 확인 입력
- 세션에서 `adminId`를 읽어 본인 비밀번호만 변경 가능
- 변경 성공 시 로그아웃 처리 (재로그인 유도)

---

## 7. 테넌트 관리 페이지

### 목록 (`/dashboard/tenants`)

- shadcn/ui `Table` 컴포넌트로 목록 표시
- **컬럼:** 업체명, 관리자명, 이메일, 전화번호, 가입일, 액션(상세 / 삭제)
- 검색: 업체명 또는 이메일 기준 (`?search=` URL 파라미터, nuqs)
- 페이지네이션: 20건 단위, URL 파라미터(`?page=1`)로 상태 관리 (nuqs)

### 테넌트 상세 (`/dashboard/tenants/[tenantId]`)

- **테넌트 기본 정보:** 업체명, 관리자명, 이메일, 전화번호, 가입일
- **수정 가능 필드:** 업체명, 관리자명, 전화번호
- **하단 섹션:** 해당 테넌트의 워크스페이스 목록 (이름, 지상/지하 층수, 생성일) — 읽기 전용

### 테넌트 삭제

- 목록에서 삭제 버튼 클릭 → `AlertDialog`로 확인 후 삭제
- 삭제 시 연관된 워크스페이스, 시설 타입, 시설 정보 CASCADE 삭제 (Supabase FK 설정)

---

## 8. 대시보드 홈 (`/dashboard`)

- 운영 통계 카드 3종:
  - 총 어드민 수 (admins 테이블 count)
  - 총 테넌트 수 (tenants 테이블 count)
  - 총 시설 수 (facilities 테이블 count)
- shadcn/ui `Card` 컴포넌트 3열 그리드 레이아웃

---

## 9. 데이터 접근 규칙

- **슈퍼어드민 전체 접근:** `tenant_id` 필터 없음 — 모든 테넌트 데이터에 접근
- **비밀번호 노출 금지:** `password_hash` 컬럼은 mapper에서 반드시 제외
- **모든 Server Action:** `requireAdmin()` 헬퍼로 세션 검증 후 실행

---

## 10. 구현 파이프라인

```
db-architect  → admins 테이블 마이그레이션 + 초기 시딩 SQL
auth-engineer → Auth.js Credentials Provider (admins 테이블 기반)
backend-engineer → domain/admin + domain/tenant + domain/stats 레이어드 구현
ui-engineer   → 로그인, 대시보드, 어드민 CRUD, 테넌트 CRUD 화면
qa-engineer   → 인증 보호, CRUD 정합성, 페이지네이션, 비밀번호 해싱 검증
```