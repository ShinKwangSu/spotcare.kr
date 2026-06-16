# spotcare.kr — 시설 관리 어드민 MVP

## 하네스: spotcare.kr MVP

**목표:** 모노레포(`apps/app` + `apps/admin`) 기반 멀티테넌트 시설 관리 시스템을 5명의 전문 에이전트 팀이 DB → Auth → Backend → UI → QA 파이프라인으로 구현

**구조 원칙:**
- **에이전트** (5개): 기술 규칙 담당 — `apps/app`과 `apps/admin` 양쪽에 동일하게 적용
- **스킬**: 도메인 정책 + 경로 담당 — 앱별로 분리 (`facility-*` vs `admin-*`)
- **공유 패키지**: `@spotcare/database` (Supabase 클라이언트/타입/유틸), `@spotcare/ui` (shadcn 컴포넌트)

**파이프라인:**
```
[공통] db-architect (db-schema)
[app]  auth-engineer(auth-setup) → backend-engineer(facility-backend) → ui-engineer(facility-ui) → qa-engineer
[admin] auth-engineer(admin-auth-setup) → backend-engineer(admin-backend) → ui-engineer(admin-ui) → qa-engineer
```

**트리거:** spotcare.kr 개발/구현 관련 작업 요청 시 `mvp-orchestrator` 스킬을 사용하라. 단순 개념 질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-16 | 초기 구성 | 전체 | STEP_1.md 기반 MVP 구현 하네스 신규 구축 |
| 2026-06-16 | 모노레포 전환 반영 | 전체 | apps/app + apps/admin 이중 파이프라인, @spotcare/database/@spotcare/ui 공유 패키지 도입 |
