-- =============================================================================
-- spotcare.kr MVP — Migration 009
-- 소프트 딜리트: 핵심 엔티티 테이블에 deleted_at 컬럼 추가
-- =============================================================================
-- deleted_at IS NULL  → 활성 레코드
-- deleted_at IS NOT NULL → 삭제된 레코드 (값 = 삭제 시각)
-- =============================================================================

ALTER TABLE workspaces      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE facility_types  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE facilities      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE inspectors      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE checklists      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tenants         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE admins          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 조회 성능을 위한 부분 인덱스 (NULL = 활성 레코드만 인덱싱)
CREATE INDEX IF NOT EXISTS idx_workspaces_active      ON workspaces     (tenant_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_facility_types_active  ON facility_types (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_active      ON facilities     (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inspectors_active      ON inspectors     (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checklists_active      ON checklists     (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_items_active ON checklist_items(checklist_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_active         ON tenants        (id)           WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admins_active          ON admins         (id)           WHERE deleted_at IS NULL;

-- =============================================================================
-- END OF MIGRATION 009
-- =============================================================================
