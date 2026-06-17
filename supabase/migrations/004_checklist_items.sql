-- =============================================================================
-- spotcare.kr MVP — Migration 004
-- checklist_items 테이블 추가 (점검표 항목)
-- =============================================================================

CREATE TABLE IF NOT EXISTS checklist_items (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  UUID         NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  workspace_id  UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id     UUID         NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  item_name     VARCHAR(255) NOT NULL,
  response_type VARCHAR(20)  NOT NULL DEFAULT 'checklist'
                             CHECK (response_type IN ('checklist')),
  is_required   BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order    INT          NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  checklist_items IS '점검표의 개별 항목. 점검표 삭제 시 CASCADE.';
COMMENT ON COLUMN checklist_items.response_type IS '응답 방식. 현재는 checklist만 지원.';
COMMENT ON COLUMN checklist_items.is_required   IS '점검자가 반드시 응답해야 하는 필수 항목 여부.';
COMMENT ON COLUMN checklist_items.sort_order    IS '항목 표시 순서(0-based).';
COMMENT ON COLUMN checklist_items.tenant_id     IS 'RLS 격리용 비정규화 FK.';

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_tenant_id    ON checklist_items(tenant_id);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_checklist_items ON checklist_items;
CREATE POLICY tenant_isolation_checklist_items
ON checklist_items
FOR ALL
USING      (tenant_id = app_current_tenant_id())
WITH CHECK (tenant_id = app_current_tenant_id());

-- =============================================================================
-- END OF MIGRATION 004
-- =============================================================================
