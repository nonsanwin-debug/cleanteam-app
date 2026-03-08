-- 새로운 현장이 추가될 때 기본적으로 모두 '숨기기' 상태로 등록되도록 설정합니다.
ALTER TABLE sites ALTER COLUMN hidden_from_promotion SET DEFAULT true;

-- 현재 완료된 모든 현장(이미 687개의 사진이 있는 현장들)도 일괄 숨기기 처리합니다.
-- 관리자 페이지에서 사진이 잘 있는 현장들만 '다시 노출' 버튼을 눌러주셔야 합니다.
UPDATE sites SET hidden_from_promotion = true WHERE status = 'completed';
