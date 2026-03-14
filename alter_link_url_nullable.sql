-- ads 테이블의 link_url 칼럼에 설정된 NOT NULL 제약 조건을 제거합니다.
-- 이제 링크 없이 전화번호만 단독으로 등록할 수 있습니다.
ALTER TABLE public.ads ALTER COLUMN link_url DROP NOT NULL;
