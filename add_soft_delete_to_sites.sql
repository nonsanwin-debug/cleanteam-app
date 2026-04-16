-- sites 테이블에 soft delete 컬럼 추가
ALTER TABLE sites ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS deleted_by_name TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS deleted_by_role TEXT; -- 'admin' (업체), 'partner' (파트너), 'master' (마스터)
