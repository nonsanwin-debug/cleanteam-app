-- users 테이블에 계좌번호 정보를 저장할 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_info TEXT;

-- 기존 데이터가 있다면 확인 (선택사항)
SELECT id, name, account_info FROM users LIMIT 5;