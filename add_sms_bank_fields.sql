-- 관리자가 설정하는 SMS 수금 메시지용 계좌 정보
-- companies 테이블에 추가 (회사 단위 설정)

ALTER TABLE companies ADD COLUMN IF NOT EXISTS sms_bank_name TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sms_account_number TEXT DEFAULT '';
