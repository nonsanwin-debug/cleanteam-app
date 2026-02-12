-- 관리자가 설정하는 SMS 수금 메시지용 설정
-- companies 테이블에 추가 (회사 단위 설정)

ALTER TABLE companies ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sms_bank_name TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sms_account_number TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sms_message_template TEXT DEFAULT '고객님 청소는 잘 마무리 되었습니다
아래 계좌번호로 명시된 금액 입금 후
예금주 성함과 함께 문자 부탁드리겠습니다

입금 계좌번호 :
{은행명}
{계좌번호}
잔금 : {잔금}원
추가금 : {추가금}원
합계 : {합계}원

추후 부족하신 부분이나 문제가 있는 부분에 대해서
연락주시면 바로 처리 도와드리겠습니다';
