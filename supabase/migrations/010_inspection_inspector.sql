-- =============================================================================
-- spotcare.kr MVP — Migration 010
-- inspection_sessions 에 inspector_id 추가
-- =============================================================================
-- verifyAndCreateSession 이 점검자를 확인하지만 기록하지 않던 문제를 수정.
-- 이제 인증한 점검자의 UUID 를 세션에 저장해 이력 조회 시 점검자 정보를 제공한다.
-- 기존 행은 NULL 허용(nullable).
-- =============================================================================

ALTER TABLE inspection_sessions
  ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES inspectors(id);

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_inspector_id
  ON inspection_sessions(inspector_id)
  WHERE inspector_id IS NOT NULL;

COMMENT ON COLUMN inspection_sessions.inspector_id IS
  '점검을 수행한 점검자 UUID. 전화번호 인증 후 세션 생성 시 기록된다.';
