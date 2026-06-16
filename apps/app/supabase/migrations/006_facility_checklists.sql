-- =============================================================================
-- spotcare.kr MVP — Migration 006
-- facility_checklists: 시설-점검표 M:N 연결 테이블
-- =============================================================================

CREATE TABLE IF NOT EXISTS facility_checklists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (facility_id, checklist_id)
);

CREATE INDEX IF NOT EXISTS idx_facility_checklists_facility_id  ON facility_checklists(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_checklists_checklist_id ON facility_checklists(checklist_id);
CREATE INDEX IF NOT EXISTS idx_facility_checklists_workspace_id ON facility_checklists(workspace_id);
CREATE INDEX IF NOT EXISTS idx_facility_checklists_tenant_id    ON facility_checklists(tenant_id);

ALTER TABLE facility_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_facility_checklists ON facility_checklists FOR ALL
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

-- =============================================================================
-- END OF MIGRATION 006
-- =============================================================================
