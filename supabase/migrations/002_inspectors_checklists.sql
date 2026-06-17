-- =============================================================================
-- spotcare.kr MVP — Migration 002
-- 점검자(inspectors) + 점검표(checklists) 테이블 추가
-- =============================================================================

-- =============================================================================
-- 1. inspectors (점검자)
--    워크스페이스 레벨 엔티티. 각 워크스페이스별로 담당자를 관리.
-- =============================================================================
CREATE TABLE IF NOT EXISTS inspectors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  phone        VARCHAR(11),
  email        VARCHAR(255),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  inspectors IS '점검을 수행하는 담당자. 워크스페이스 레벨 엔티티.';
COMMENT ON COLUMN inspectors.phone IS '숫자만, 최대 11자리.';
COMMENT ON COLUMN inspectors.tenant_id IS 'RLS 격리용 비정규화 FK.';

CREATE INDEX IF NOT EXISTS idx_inspectors_workspace_id ON inspectors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inspectors_tenant_id    ON inspectors(tenant_id);

ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspectors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_inspectors ON inspectors;
CREATE POLICY tenant_isolation_inspectors
ON inspectors
FOR ALL
USING      (tenant_id = app_current_tenant_id())
WITH CHECK (tenant_id = app_current_tenant_id());

-- =============================================================================
-- 2. checklists (점검표)
--    워크스페이스 레벨 엔티티. 점검 주기·횟수·요일을 정의함.
--    days: 요일 배열(0=일~6=토), weekly 주기일 때만 사용.
-- =============================================================================
CREATE TABLE IF NOT EXISTS checklists (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  checklist_name VARCHAR(255) NOT NULL,
  description    TEXT,
  repeat_cycle   VARCHAR(10)  NOT NULL CHECK (repeat_cycle IN ('daily', 'weekly', 'monthly')),
  count          INT          NOT NULL DEFAULT 1 CHECK (count >= 1),
  days           INT[],
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  checklists IS '시설 점검표. 주기(daily/weekly/monthly)와 횟수를 정의.';
COMMENT ON COLUMN checklists.days IS '요일 배열(0=일~6=토). repeat_cycle=weekly 일 때만 사용.';
COMMENT ON COLUMN checklists.tenant_id IS 'RLS 격리용 비정규화 FK.';

CREATE INDEX IF NOT EXISTS idx_checklists_workspace_id ON checklists(workspace_id);
CREATE INDEX IF NOT EXISTS idx_checklists_tenant_id    ON checklists(tenant_id);

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_checklists ON checklists;
CREATE POLICY tenant_isolation_checklists
ON checklists
FOR ALL
USING      (tenant_id = app_current_tenant_id())
WITH CHECK (tenant_id = app_current_tenant_id());

-- =============================================================================
-- END OF MIGRATION 002
-- =============================================================================
