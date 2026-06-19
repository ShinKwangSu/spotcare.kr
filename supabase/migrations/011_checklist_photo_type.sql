-- =============================================================================
-- spotcare.kr MVP — Migration 011
-- checklist_items.response_type 에 'photo' 추가 + inspection-photos 버킷 생성
-- =============================================================================

-- CHECK 제약 교체: 'checklist' → 'checklist' | 'photo'
ALTER TABLE checklist_items
  DROP CONSTRAINT IF EXISTS checklist_items_response_type_check;

ALTER TABLE checklist_items
  ADD CONSTRAINT checklist_items_response_type_check
  CHECK (response_type IN ('checklist', 'photo'));

COMMENT ON COLUMN checklist_items.response_type IS
  '응답 방식. checklist: 체크박스, photo: 사진 첨부 필수';

-- Supabase Storage 버킷 생성 (public)
-- 사진 URL 을 item_results JSONB 에 직접 저장하므로 public 버킷으로 운영한다.
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

-- service_role 은 기본 full access 이므로 별도 정책 불필요.
-- anon/authenticated 업로드 차단: Server Action 에서 service_role 로만 업로드한다.
