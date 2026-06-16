---
name: mvp-orchestrator
description: spotcare.kr MVP 전체 구현 오케스트레이터. DB 스키마 → 인증 → 백엔드 → UI → QA 순서로 5명의 전문 에이전트를 파이프라인으로 조율한다. '구현해줘', '만들어줘', '개발 시작', '다음 단계', '다시 실행', '재실행', '업데이트', '수정', '보완', '이어서', 'STEP_1', 'MVP', '시설 관리', '어드민' 등 spotcare.kr 개발 관련 모든 요청 시 반드시 이 스킬을 사용한다.
---

# MVP Orchestrator — spotcare.kr

## 파이프라인 구조

에이전트 5개는 `apps/app`과 `apps/admin` 양쪽에 동일하게 사용된다.
**무엇을 구현할지(도메인, 경로, 정책)는 스킬이 결정한다.**
**어떻게 구현할지(아키텍처 패턴)는 `nextjs-guide` 스킬이 결정한다.**

```
[공통] db-architect (db-schema)
         ↓
[app]  auth-engineer     → backend-engineer                    → ui-engineer                  → qa-engineer
       (auth-setup)        (nextjs-guide + facility-backend)     (nextjs-guide + facility-ui)   (_workspace/app/)

[admin] auth-engineer    → backend-engineer                    → ui-engineer                  → qa-engineer
        (admin-auth-setup) (nextjs-guide + admin-backend)        (nextjs-guide + admin-ui)      (_workspace/admin/)
```

## _workspace/ 디렉터리 구조

```
_workspace/
├── 01_db_schema.md          — 공유 (두 앱 모두 참조)
├── app/
│   ├── 02_auth_session.md
│   ├── 03_backend_api.md
│   ├── 04_ui_components.md
│   └── 05_qa_report.md
└── admin/
    ├── 02_auth_session.md
    ├── 03_backend_api.md
    ├── 04_ui_components.md
    └── 05_qa_report.md
```

---

## Phase 0: 컨텍스트 확인

시작 전 `_workspace/` 디렉터리 존재 여부와 사용자 요청의 타겟을 파악한다.

- **`_workspace/` 없음** → 초기 실행: Phase 1부터 전체 실행
- **특정 앱만 언급** (`app` 또는 `admin`) → 해당 앱 파이프라인만 실행
- **전체 재실행 요청** → `_workspace/`를 `_workspace_prev/`로 이동 후 전체 실행
- **특정 부분 수정 요청** → 해당 에이전트만 재실행 (부분 재실행)

**타겟 결정 기준:**
- "시설 관리", "워크스페이스", "app" → `apps/app` 파이프라인
- "슈퍼어드민", "테넌트 관리", "admin" → `apps/admin` 파이프라인
- 둘 다 언급 또는 "전체" → 두 파이프라인 순차 실행

---

## Phase 1: DB 스키마 (db-architect) — 공통

**에이전트:** `db-architect` (model: opus)

**프롬프트 구성:**
```
db-schema 스킬과 STEP_1.md를 읽고 spotcare.kr MVP Supabase 스키마를 구현하라.
[admin 파이프라인 포함 시]: admin-auth-setup 스킬의 admins 테이블도 함께 생성한다.

산출물:
1. supabase/migrations/NNN_*.sql — DDL + RLS 정책
2. packages/database/src/types/database.ts — TypeScript 타입 (공유)
3. _workspace/01_db_schema.md — 다음 에이전트를 위한 스키마 요약

이전 산출물이 있으면 먼저 읽고 개선을 반영한다.
```

---

## Phase 2: 인증 (auth-engineer)

**에이전트:** `auth-engineer` (model: opus)

**선행 조건:** `_workspace/01_db_schema.md` 존재 확인

### apps/app 인증

**프롬프트 구성:**
```
auth-setup 스킬과 _workspace/01_db_schema.md를 읽고
apps/app 테넌트 인증 시스템을 구현하라.

타겟 앱: apps/app

산출물:
1. apps/app/auth.ts, apps/app/auth.config.ts — Auth.js v5 설정
2. apps/app/middleware.ts — 경로 보호
3. apps/app/app/actions/auth.ts — 회원가입/로그인 Server Action
4. _workspace/app/02_auth_session.md — 세션 구조, tenantId 접근 방법 요약

이전 산출물이 있으면 먼저 읽고 개선을 반영한다.
```

### apps/admin 인증

**프롬프트 구성:**
```
admin-auth-setup 스킬과 _workspace/01_db_schema.md를 읽고
apps/admin 슈퍼어드민 인증 시스템을 구현하라.

타겟 앱: apps/admin

산출물:
1. apps/admin/auth.ts, apps/admin/auth.config.ts — Auth.js v5 설정
2. apps/admin/middleware.ts — 경로 보호
3. apps/admin/app/actions/auth.ts — 로그인/로그아웃 Server Action
4. _workspace/admin/02_auth_session.md — 세션 구조, adminId 접근 방법 요약

이전 산출물이 있으면 먼저 읽고 개선을 반영한다.
```

---

## Phase 3: 백엔드 (backend-engineer)

**에이전트:** `backend-engineer` (model: opus)

**선행 조건:** `_workspace/01_db_schema.md` + 해당 앱 `02_auth_session.md` 존재 확인

### apps/app 백엔드

**프롬프트 구성:**
```
nextjs-guide 스킬, facility-backend 스킬,
_workspace/01_db_schema.md, _workspace/app/02_auth_session.md를 읽고
apps/app 도메인 백엔드를 구현하라.

타겟 앱: apps/app
- nextjs-guide의 도메인 레이어드 아키텍처 구조를 반드시 따른다
- Supabase 클라이언트는 @spotcare/database에서 import, repository에 주입
- 변경 Action은 ActionResult 패턴, 조회 Action은 throw

산출물:
1. apps/app/domain/workspace/ — types/queries/hooks/actions/service/repository/mapper
2. apps/app/domain/facility-type/ — 동일 구조
3. apps/app/domain/facility/ — 동일 구조
4. _workspace/app/03_backend_api.md — 도메인별 Action 시그니처, Query Options 목록

이전 산출물이 있으면 먼저 읽고 개선을 반영한다.
```

### apps/admin 백엔드

**프롬프트 구성:**
```
nextjs-guide 스킬, admin-backend 스킬,
_workspace/01_db_schema.md, _workspace/admin/02_auth_session.md를 읽고
apps/admin 도메인 백엔드를 구현하라.

타겟 앱: apps/admin
- nextjs-guide의 도메인 레이어드 아키텍처 구조를 반드시 따른다
- Supabase 클라이언트는 @spotcare/database에서 import, repository에 주입
- 슈퍼어드민은 tenant_id 필터 없이 전체 데이터 접근 (의도된 동작)
- 변경 Action은 ActionResult 패턴, 조회 Action은 throw

산출물:
1. apps/admin/domain/tenant/ — types/queries/hooks/actions/service/repository/mapper
2. apps/admin/domain/stats/ — 동일 구조
3. _workspace/admin/03_backend_api.md — 도메인별 Action 시그니처, Query Options 목록

이전 산출물이 있으면 먼저 읽고 개선을 반영한다.
```

---

## Phase 4: UI (ui-engineer)

**에이전트:** `ui-engineer` (model: opus)

**선행 조건:** 해당 앱 `03_backend_api.md` 존재 확인

### apps/app UI

**프롬프트 구성:**
```
nextjs-guide 스킬, facility-ui 스킬, _workspace/app/03_backend_api.md를 읽고
apps/app 어드민 UI를 구현하라.

타겟 앱: apps/app
- nextjs-guide의 서버/클라이언트 경계, prefetch, Suspense 정책을 반드시 따른다
- 리스트/상세 페이지: Server Component에서 runPrefetch + HydrationBoundary
- Client Component: 도메인 React Query 훅만 사용 (useEffect 데이터 패칭 금지)
- UI 컴포넌트는 @spotcare/ui에서 import
- URL 상태(필터 등)는 nuqs 사용

산출물:
1. apps/app/app/(auth)/login/page.tsx, signup/page.tsx
2. apps/app/app/dashboard/layout.tsx (사이드바 네비게이션)
3. apps/app/app/dashboard/workspaces/page.tsx (prefetch + 목록 + 생성 Dialog)
4. apps/app/app/dashboard/[workspaceId]/facility-types/page.tsx (CRUD)
5. apps/app/app/dashboard/[workspaceId]/facilities/page.tsx (Table + Form)
6. _workspace/app/04_ui_components.md — 주요 컴포넌트 경로, prefetch 구조 요약

이전 산출물이 있으면 먼저 읽고 개선을 반영한다.
```

### apps/admin UI

**프롬프트 구성:**
```
nextjs-guide 스킬, admin-ui 스킬, _workspace/admin/03_backend_api.md를 읽고
apps/admin 슈퍼어드민 UI를 구현하라.

타겟 앱: apps/admin
- nextjs-guide의 서버/클라이언트 경계, prefetch, Suspense 정책을 반드시 따른다
- 리스트/상세 페이지: Server Component에서 runPrefetch + HydrationBoundary
- Client Component: 도메인 React Query 훅만 사용
- UI 컴포넌트는 @spotcare/ui에서 import
- URL 상태(페이지네이션, 필터 등)는 nuqs 사용

산출물:
1. apps/admin/app/(auth)/login/page.tsx
2. apps/admin/app/dashboard/layout.tsx (사이드바 네비게이션)
3. apps/admin/app/dashboard/page.tsx (운영 통계, prefetch)
4. apps/admin/app/dashboard/tenants/page.tsx (테넌트 목록, prefetch + nuqs)
5. apps/admin/app/dashboard/tenants/[tenantId]/page.tsx (테넌트 상세, prefetch)
6. _workspace/admin/04_ui_components.md — 주요 컴포넌트 경로, prefetch 구조 요약

이전 산출물이 있으면 먼저 읽고 개선을 반영한다.
```

---

## Phase 5: QA (qa-engineer)

**에이전트:** `qa-engineer` (model: opus)

**선행 조건:** 해당 앱의 모든 `_workspace/{target}/*.md` 존재 확인

**프롬프트 구성:**
```
nextjs-guide 스킬, _workspace/01_db_schema.md,
_workspace/{target}/ 내 모든 산출물 요약을 읽고
실제 생성된 소스 파일들을 교차 검증하라.

타겟 앱: {apps/app | apps/admin}

공통 검증 (nextjs-guide 기준):
- 도메인 레이어 구조: domain/{name}/types·queries·hooks·actions·service·repository·mapper
- repository 클라이언트 주입: 내부에서 직접 Supabase 생성 여부 확인
- React Query 훅: Client Component에서 useEffect 데이터 패칭 없이 도메인 훅만 사용
- ActionResult 패턴: 변경 Action이 { success, data?, error? } 반환 여부
- @spotcare/database, @spotcare/ui import 사용 여부
- 크로스 도메인 deep import 없는지

apps/app 추가 검증:
- 데이터 격리: repository의 tenant_id 필터 + RLS 정책 교차 확인
- 층수 변환: floorToDisplay/generateFloorOptions 엣지케이스 (0층, 경계값)
- 인증 흐름: middleware.ts 보호 경로 설정 검증

apps/admin 추가 검증:
- 권한 확인: 모든 action에서 requireAdmin() 호출 여부
- 데이터 노출: tenant_id 필터 없음 확인 (슈퍼어드민 전체 접근이 의도된 동작)
- mapper에서 password_hash 노출 여부

산출물: _workspace/{target}/05_qa_report.md (심각도별 이슈 목록)

이전 QA 리포트가 있으면 기존 이슈 수정 여부도 함께 확인한다.
```

---

## Phase 6: 결과 보고

모든 에이전트 실행 완료 후 사용자에게 요약 보고:
- 생성된 파일 목록 (Phase별, 앱별)
- QA 리포트 핵심 요약 (`_workspace/{target}/05_qa_report.md` 읽기)
- Critical 이슈가 있으면 수정 방향 제시
- 다음 단계 제안

---

## 에러 핸들링

| 상황 | 처리 방법 |
|------|----------|
| 에이전트 실패 | 1회 재시도 후 실패 내용을 보고서에 기록하고 다음 Phase 진행 |
| 선행 파일 없음 | 해당 Phase 건너뛰고 사용자에게 알림 |
| Critical QA 이슈 | QA 리포트에 명시 후 사용자에게 수정 권고 |

---

## 실행 시나리오

### apps/app 전체 구현
```
사용자: "STEP_1.md 기반으로 app MVP 구현 시작해줘"
→ Phase 1(공통 DB) → Phase 2(app 인증) → Phase 3(app 백엔드) → Phase 4(app UI) → Phase 5(app QA)
```

### apps/admin 전체 구현
```
사용자: "admin MVP 구현해줘"
→ Phase 1 확인(공통 DB, 없으면 실행) → Phase 2(admin 인증) → Phase 3(admin 백엔드) → Phase 4(admin UI) → Phase 5(admin QA)
```

### 두 앱 전체 구현
```
사용자: "app이랑 admin 전체 구현해줘"
→ Phase 1(공통 DB)
→ Phase 2-5 (app 파이프라인)
→ Phase 2-5 (admin 파이프라인)
```

### 부분 재실행
```
사용자: "층수 변환 로직 수정해줘"
→ backend-engineer(facility-backend 스킬) 재실행
→ qa-engineer(app) 재실행

사용자: "테넌트 목록 UI 수정해줘"
→ ui-engineer(admin-ui 스킬) 재실행
→ qa-engineer(admin) 재실행
```
