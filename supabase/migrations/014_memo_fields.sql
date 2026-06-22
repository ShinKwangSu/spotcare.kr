-- workspaces: memo 컬럼 추가
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS memo TEXT;

-- facilities: location_description, notes 제거 → memo 통합
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS memo TEXT;

ALTER TABLE facilities
  DROP COLUMN IF EXISTS location_description,
  DROP COLUMN IF EXISTS notes;
