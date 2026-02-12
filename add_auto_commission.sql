-- 1. wallet_logs type 제약조건 업데이트: 'commission' 추가
ALTER TABLE public.wallet_logs DROP CONSTRAINT IF EXISTS wallet_logs_type_check;
ALTER TABLE public.wallet_logs ADD CONSTRAINT wallet_logs_type_check
  CHECK (type IN ('earning', 'penalty', 'withdrawal_request', 'withdrawal_paid', 'withdrawal_refund', 'commission'));

-- 2. 작업 완료 시 추가금 퍼센티지 자동 적립 RPC
CREATE OR REPLACE FUNCTION public.auto_commission_on_complete(
    p_site_id UUID,
    p_worker_id UUID,
    p_amount INTEGER,
    p_site_name TEXT,
    p_commission_rate INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_new_balance INTEGER;
    v_company_id UUID;
BEGIN
    -- 회사 ID 조회
    SELECT company_id INTO v_company_id FROM public.users WHERE id = p_worker_id;

    -- 잔액 증가
    UPDATE public.users
    SET current_money = COALESCE(current_money, 0) + p_amount
    WHERE id = p_worker_id
    RETURNING current_money INTO v_new_balance;

    -- 로그 기록
    INSERT INTO public.wallet_logs (user_id, company_id, type, amount, balance_after, description, reference_id)
    VALUES (
        p_worker_id,
        v_company_id,
        'commission',
        p_amount,
        v_new_balance,
        '추가금 자동 적립: ' || p_site_name || ' (추가금 ' || p_commission_rate || '%)',
        p_site_id
    );

    RETURN jsonb_build_object('success', true, 'credited', p_amount, 'balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
