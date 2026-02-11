-- 1. AS Requests 테이블에 차감 금액 컬럼 추가
ALTER TABLE public.as_requests 
ADD COLUMN IF NOT EXISTS penalty_amount INTEGER DEFAULT 0;

-- 2. AS 등록 및 금액 차감 원자적 처리를 위한 RPC 함수
CREATE OR REPLACE FUNCTION public.create_as_with_penalty_v1(
    p_site_id UUID,
    p_site_name TEXT,
    p_worker_id UUID,
    p_description TEXT,
    p_occurred_at DATE,
    p_status TEXT,
    p_penalty_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_money INTEGER;
    v_new_as_id UUID;
BEGIN
    -- 1. 팀장 정보가 있고 차감 금액이 있는 경우 잔액 확인
    IF p_worker_id IS NOT NULL AND p_penalty_amount > 0 THEN
        SELECT current_money INTO v_current_money
        FROM public.users
        WHERE id = p_worker_id;

        IF v_current_money IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', '해당 팀장을 찾을 수 없습니다.');
        END IF;

        IF v_current_money < p_penalty_amount THEN
            RETURN jsonb_build_object('success', false, 'error', '잔액이 부족합니다. (현재: ' || v_current_money || '원)');
        END IF;

        -- 2. 금액 차감
        UPDATE public.users
        SET current_money = v_current_money - p_penalty_amount
        WHERE id = p_worker_id;
    END IF;

    -- 3. AS 내역 등록
    INSERT INTO public.as_requests (
        site_id,
        site_name,
        worker_id,
        description,
        occurred_at,
        status,
        penalty_amount
    )
    VALUES (
        p_site_id,
        p_site_name,
        p_worker_id,
        p_description,
        p_occurred_at,
        p_status,
        p_penalty_amount
    )
    RETURNING id INTO v_new_as_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_as_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
