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

## 코딩 컨벤션

### 소프트 딜리트 (필수)

삭제 기능이 있는 모든 엔티티는 하드 딜리트(`.delete()`) 대신 소프트 딜리트를 사용한다.

**규칙:**
- 새 엔티티 테이블 생성 시 `deleted_at TIMESTAMPTZ` 컬럼을 반드시 포함한다.
- 삭제 = `.update({ deleted_at: new Date().toISOString() })`
- 조회 = 모든 SELECT에 `.is('deleted_at', null)` 필터 필수
- 수정 = `.update(...).is('deleted_at', null)` — 삭제된 레코드가 수정되지 않도록 차단
- 부모 엔티티 삭제 시 자식 엔티티도 코드에서 cascade soft delete (DB CASCADE는 하드 딜리트 전용이므로 사용 불가)
- 예외: 조인 테이블(`facility_checklists` 등)은 독립 가치 없으므로 하드 딜리트 유지

**TypeScript 타입:** 새 엔티티의 Row 타입과 Insert 타입 모두에 `deleted_at?: string | null` 추가

**마이그레이션 패턴:**
```sql
ALTER TABLE new_table ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_new_table_active ON new_table (tenant_id) WHERE deleted_at IS NULL;
```

---

## 변경 이력
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-16 | 초기 구성 | 전체 | STEP_1.md 기반 MVP 구현 하네스 신규 구축 |
| 2026-06-16 | 모노레포 전환 반영 | 전체 | apps/app + apps/admin 이중 파이프라인, @spotcare/database/@spotcare/ui 공유 패키지 도입 |
| 2026-06-19 | 소프트 딜리트 컨벤션 추가 | 전체 | 모든 삭제 기능에 deleted_at 방식 의무화 |
