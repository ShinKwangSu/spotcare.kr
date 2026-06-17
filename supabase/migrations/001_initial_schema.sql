-- =============================================================================
-- spotcare.kr MVP — Initial Schema (001)
-- 멀티테넌트 시설 관리 시스템 어드민 (Phase 1)
-- =============================================================================
--
-- 설계 원칙
--   1. 데이터 격리 우선: 모든 비즈니스 테이블은 tenant_id로 격리한다.
--      RLS는 추가 안전장치가 아니라 핵심 보안 레이어다.
--   2. UUID PK: 모든 PK는 gen_random_uuid()로 생성한다.
--   3. 층수는 정수(INT): 지상=양수, 지하=음수, 없음=0.
--      표시용 변환(3F, B1)은 애플리케이션 레이어 책임이다.
--   4. FK 참조 무결성: facility_types / facilities는 workspace_id와
--      tenant_id를 모두 FK로 갖는다(이중 격리).
--
-- 멱등성: 본 마이그레이션은 안전하게 재실행할 수 있도록 IF NOT EXISTS /
--         DROP POLICY IF EXISTS 등을 사용한다.
-- =============================================================================

-- gen_random_uuid() 를 위한 확장 (Supabase 기본 활성화이나 명시적으로 보장)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. tenants (마스터 계정 / 업체)
--    하나의 업체 = 하나의 마스터 계정. 모든 격리의 최상위 루트.
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  VARCHAR(255) NOT NULL,                 -- 업체명(회사명)
  admin_name    VARCHAR(100) NOT NULL,                 -- 관리자 이름
  phone         VARCHAR(11) NOT NULL,                  -- 전화번호 (숫자만, 최대 11자리)
  email         VARCHAR(255) UNIQUE NOT NULL,          -- 로그인 식별자
  password_hash VARCHAR(255) NOT NULL,                 -- bcrypt/argon2 해시
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tenants IS '마스터 계정/업체. 멀티테넌트 격리의 최상위 루트.';
COMMENT ON COLUMN tenants.email         IS '로그인 식별자(고유).';
COMMENT ON COLUMN tenants.password_hash IS '평문 저장 금지. 해시만 저장.';

-- =============================================================================
-- 2. workspaces (건물 / 장소)
--    하나의 tenant 는 여러 workspace 를 가질 수 있다.
--    tenant 삭제 시 하위 workspace 도 함께 삭제(CASCADE).
-- =============================================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_name VARCHAR(255) NOT NULL,                -- 워크스페이스(건물) 이름
  max_floor      INT NOT NULL DEFAULT 0,               -- 지상 최고 층 (양수, 없으면 0)
  min_floor      INT NOT NULL DEFAULT 0,               -- 지하 최저 층 (음수, 없으면 0)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 층수 무결성: 지상은 음수가 될 수 없고, 지하는 양수가 될 수 없다.
  CONSTRAINT workspaces_max_floor_non_negative CHECK (max_floor >= 0),
  CONSTRAINT workspaces_min_floor_non_positive CHECK (min_floor <= 0)
);

COMMENT ON TABLE  workspaces IS '업체가 관리하는 독립 건물/장소 단위.';
COMMENT ON COLUMN workspaces.max_floor IS '지상 최고 층수. 양수 그대로 저장(지상 10층=10), 없으면 0.';
COMMENT ON COLUMN workspaces.min_floor IS '지하 최저 층수. 음수로 저장(지하 2층=-2), 없으면 0.';

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);

-- =============================================================================
-- 3. facility_types (시설 타입 / 공간 카테고리)
--    워크스페이스 단위로 정의되는 공간 카테고리(예: 화장실, 회의실).
--    tenant_id 를 비정규화로 함께 보관하여 RLS 격리를 단순/고속화한다.
-- =============================================================================
CREATE TABLE IF NOT EXISTS facility_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  type_name    VARCHAR(100) NOT NULL,                  -- 카테고리명
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 동일 워크스페이스 내에서 타입명 중복 방지
  CONSTRAINT uq_facility_types_workspace_name UNIQUE (workspace_id, type_name)
);

COMMENT ON TABLE  facility_types IS '워크스페이스별 공간 카테고리(시설 타입).';
COMMENT ON COLUMN facility_types.tenant_id IS 'RLS 격리용 비정규화 FK. 항상 workspace.tenant_id 와 일치해야 함.';

CREATE INDEX IF NOT EXISTS idx_facility_types_workspace_id ON facility_types(workspace_id);
CREATE INDEX IF NOT EXISTS idx_facility_types_tenant_id    ON facility_types(tenant_id);

-- =============================================================================
-- 4. facilities (시설 정보)
--    실제 관리 대상 공간. 워크스페이스 + 시설 타입에 매핑된다.
--
-- [엣지 케이스 — cascade 정책]
--   - workspace 삭제 → 해당 facilities 도 삭제 (ON DELETE CASCADE)
--   - facility_type 삭제 → 참조 중인 facilities 가 있으면 삭제 차단
--       (ON DELETE RESTRICT). 타입이 사라지면 시설의 분류가 유실되므로,
--       먼저 시설을 재분류/삭제하도록 강제한다. UI 레벨에서
--       "사용 중인 타입은 삭제 불가" 안내가 필요하다.
-- =============================================================================
CREATE TABLE IF NOT EXISTS facilities (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id)     ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES tenants(id)        ON DELETE CASCADE,
  facility_type_id     UUID NOT NULL REFERENCES facility_types(id) ON DELETE RESTRICT,
  facility_name        VARCHAR(255) NOT NULL,          -- 시설명(자유 입력)
  floor                INT NOT NULL,                   -- 정수 저장(3층=3, 지하1층=-1, 층없음=0)
  location_description TEXT,                           -- 위치 설명
  notes                TEXT,                           -- 비고
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  facilities IS '실제 관리 대상 시설 정보.';
COMMENT ON COLUMN facilities.floor IS '층수 정수 저장. 지상=양수, 지하=음수, 없음=0. 표시 변환은 앱 레이어.';
COMMENT ON COLUMN facilities.tenant_id IS 'RLS 격리용 비정규화 FK. 항상 workspace.tenant_id 와 일치해야 함.';

CREATE INDEX IF NOT EXISTS idx_facilities_workspace_id     ON facilities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_facilities_tenant_id        ON facilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_facilities_facility_type_id ON facilities(facility_type_id);
-- 층수별 정렬/필터(예: '3층 시설만 보기')를 인덱스로 가속
CREATE INDEX IF NOT EXISTS idx_facilities_workspace_floor  ON facilities(workspace_id, floor);

-- =============================================================================
-- 5. Row Level Security (RLS) — 테넌트 간 데이터 격리
-- =============================================================================
--
-- 격리 메커니즘
--   서버(Server Action)는 매 요청마다 트랜잭션/세션에 현재 테넌트를 주입한다:
--
--     SELECT set_config('app.current_tenant_id', '<tenant-uuid>', false);
--     -- 또는 풀링 환경에서 트랜잭션 단위로:
--     SELECT set_config('app.current_tenant_id', '<tenant-uuid>', true);
--
--   이후 모든 쿼리는 RLS 정책에 의해 해당 tenant_id 행만 보고/쓸 수 있다.
--
-- current_setting(..., true)  ← missing_ok=true: 설정이 없으면 NULL 반환(에러 X).
--   설정이 누락되면 비교가 NULL 이 되어 0행이 노출된다(fail-closed, 안전).
--
-- 주의
--   - Supabase service_role 키는 RLS 를 BYPASS 한다. 서버에서 service_role 을
--     쓰는 경우 RLS 가 적용되지 않으므로, Server Action 의 WHERE tenant_id 필터가
--     1차 방어선이 된다. RLS 는 anon 키 경로 및 직접 DB 접근에 대한 방어선이다.
--     두 방어선을 모두 유지하여 이중 안전장치로 운영한다.
--   - tenants 테이블 자체는 로그인 전(이메일 조회) 접근이 필요하므로 RLS 를
--     적용하지 않는다. 대신 password_hash 등 민감 컬럼은 서버에서만 SELECT 한다.
-- =============================================================================

-- 현재 테넌트 ID 를 안전하게 읽는 헬퍼 (없으면 NULL → fail-closed)
CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
$$;

COMMENT ON FUNCTION app_current_tenant_id() IS
  '세션/트랜잭션에 set_config 로 주입된 app.current_tenant_id 를 UUID 로 반환. 미설정 시 NULL(접근 차단).';

-- --- workspaces RLS ---------------------------------------------------------
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_workspaces ON workspaces;
CREATE POLICY tenant_isolation_workspaces
ON workspaces
FOR ALL
USING      (tenant_id = app_current_tenant_id())
WITH CHECK (tenant_id = app_current_tenant_id());

-- --- facility_types RLS -----------------------------------------------------
ALTER TABLE facility_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_types FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_facility_types ON facility_types;
CREATE POLICY tenant_isolation_facility_types
ON facility_types
FOR ALL
USING      (tenant_id = app_current_tenant_id())
WITH CHECK (tenant_id = app_current_tenant_id());

-- --- facilities RLS ---------------------------------------------------------
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_facilities ON facilities;
CREATE POLICY tenant_isolation_facilities
ON facilities
FOR ALL
USING      (tenant_id = app_current_tenant_id())
WITH CHECK (tenant_id = app_current_tenant_id());

-- =============================================================================
-- END OF MIGRATION 001
-- =============================================================================
