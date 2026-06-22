-- 워크스페이스 주소 컬럼 추가
-- address: Daum 주소 API 반환 도로명(또는 지번) 주소
-- address_detail: 상세 주소 (동/호수 등 사용자 직접 입력)

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_detail VARCHAR(255);
