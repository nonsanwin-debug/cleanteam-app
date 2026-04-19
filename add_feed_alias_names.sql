-- companies 테이블에 피드 업체명 변경 플래그 추가
ALTER TABLE companies ADD COLUMN IF NOT EXISTS use_alias_name BOOLEAN DEFAULT false;

-- platform_settings 테이블에 피드 가짜 업체명 목록 추가
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS feed_alias_names TEXT[] DEFAULT '{}';
