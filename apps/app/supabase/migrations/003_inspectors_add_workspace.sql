-- =============================================================================
-- spotcare.kr MVP — Migration 003
-- inspectors 테이블에 workspace_id 추가 (테넌트 레벨 → 워크스페이스 레벨 전환)
-- =============================================================================
-- 개발 단계이므로 기존 점검자 데이터를 모두 삭제 후 컬럼을 추가합니다.
-- 운영 환경에서는 아래 TRUNCATE 대신 데이터 이관 작업이 필요합니다.
-- =============================================================================

-- 기존 데이터 삭제 (workspace_id 매핑 불가)
TRUNCATE TABLE inspectors;

ALTER TABLE inspectors
  ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inspectors_workspace_id ON inspectors(workspace_id);

COMMENT ON COLUMN inspectors.workspace_id IS '소속 워크스페이스. 워크스페이스 삭제 시 CASCADE.';
COMMENT ON COLUMN inspectors.tenant_id    IS 'RLS 격리용 비정규화 FK.';

-- =============================================================================
-- END OF MIGRATION 003
-- =============================================================================
