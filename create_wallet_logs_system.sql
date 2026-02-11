-- 1. Wallet Logs 테이블 생성
CREATE TABLE IF NOT EXISTS public.wallet_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('earning', 'penalty', 'withdrawal_request', 'withdrawal_paid', 'withdrawal_refund')),
    amount INTEGER NOT NULL, -- 변동 금액
    balance_after INTEGER NOT NULL, -- 변동 후 잔액
    description TEXT,
    reference_id UUID, -- 관련 현장 ID, AS ID, 출금 요청 ID 등
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.wallet_logs ENABLE ROW LEVEL SECURITY;

-- 2. 보안 정책 (Admin: 소속 업체 로그 전체 조회, Worker: 본인 로그 전용)
CREATE POLICY "Admin can view company wallet logs"
    ON public.wallet_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin' AND company_id = wallet_logs.company_id
        )
    );

CREATE POLICY "Worker can view own wallet logs"
    ON public.wallet_logs FOR SELECT
    USING (user_id = auth.uid());

GRANT ALL ON public.wallet_logs TO authenticated;
GRANT ALL ON public.wallet_logs TO service_role;


-- 3. RPC 업데이트: approve_site_payment_final_v1 (현장 지급 로그 추가)
CREATE OR REPLACE FUNCTION approve_site_payment_final_v1(
  p_site_id UUID,
  p_user_id UUID,
  p_amount INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
  v_exists BOOLEAN;
  v_new_balance INTEGER;
  v_company_id UUID;
  v_site_name TEXT;
BEGIN
  -- 1. 정보 확인
  SELECT payment_status, (id IS NOT NULL), company_id, name
  INTO v_current_status, v_exists, v_company_id, v_site_name
  FROM public.sites
  WHERE id = p_site_id
  FOR UPDATE;

  IF v_exists IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', '현장 정보를 찾을 수 없습니다.');
  END IF;

  IF v_current_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 지급 완료 처리된 현장입니다.');
  END IF;

  -- 2. 상태 및 잔액 업데이트
  UPDATE public.sites SET payment_status = 'paid', updated_at = NOW() WHERE id = p_site_id;

  UPDATE public.users
  SET current_money = COALESCE(current_money, 0) + p_amount
  WHERE id = p_user_id
  RETURNING current_money INTO v_new_balance;

  -- 3. 로그 기록
  INSERT INTO public.wallet_logs (user_id, company_id, type, amount, balance_after, description, reference_id)
  VALUES (p_user_id, v_company_id, 'earning', p_amount, v_new_balance, '현장 정산 승인: ' || v_site_name, p_site_id);

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RPC 업데이트: create_as_with_penalty_v1 (AS 페널티 로그 추가)
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
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM public.users WHERE id = p_worker_id;

    -- 1. 금액 차감 로직
    IF p_worker_id IS NOT NULL AND p_penalty_amount > 0 THEN
        SELECT current_money INTO v_current_money FROM public.users WHERE id = p_worker_id FOR UPDATE;
        
        IF v_current_money < p_penalty_amount THEN
            RETURN jsonb_build_object('success', false, 'error', '잔액이 부족합니다.');
        END IF;

        UPDATE public.users SET current_money = v_current_money - p_penalty_amount WHERE id = p_worker_id
        RETURNING current_money INTO v_current_money;

        -- 로그 기록
        INSERT INTO public.wallet_logs (user_id, company_id, type, amount, balance_after, description, reference_id)
        VALUES (p_worker_id, v_company_id, 'penalty', -p_penalty_amount, v_current_money, 'AS 페널티 차감: ' || p_site_name, p_site_id);
    END IF;

    -- 2. AS 등록
    INSERT INTO public.as_requests (site_id, site_name, worker_id, description, occurred_at, status, penalty_amount)
    VALUES (p_site_id, p_site_name, p_worker_id, p_description, p_occurred_at, p_status, p_penalty_amount)
    RETURNING id INTO v_new_as_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_as_id);
END;
$$;


-- 5. RPC 신규 생성: request_withdrawal_v1 (출금 요청 및 선차감 로그)
CREATE OR REPLACE FUNCTION public.request_withdrawal_v1(
    p_user_id UUID,
    p_amount INTEGER,
    p_bank_name TEXT,
    p_account_number TEXT,
    p_account_holder TEXT
) RETURNS JSONB AS $$
DECLARE
    v_current_money INTEGER;
    v_company_id UUID;
    v_request_id UUID;
BEGIN
    SELECT current_money, company_id INTO v_current_money, v_company_id 
    FROM public.users WHERE id = p_user_id FOR UPDATE;

    IF v_current_money < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', '출금 가능 금액이 부족합니다.');
    END IF;

    -- 1. 출금 요청 생성
    INSERT INTO public.withdrawal_requests (user_id, amount, bank_name, account_number, account_holder, status)
    VALUES (p_user_id, p_amount, p_bank_name, p_account_number, p_account_holder, 'pending')
    RETURNING id INTO v_request_id;

    -- 2. 잔액 차감
    UPDATE public.users SET current_money = v_current_money - p_amount WHERE id = p_user_id
    RETURNING current_money INTO v_current_money;

    -- 3. 로그 기록
    INSERT INTO public.wallet_logs (user_id, company_id, type, amount, balance_after, description, reference_id)
    VALUES (p_user_id, v_company_id, 'withdrawal_request', -p_amount, v_current_money, '출금 요청 (승인 대기)', v_request_id);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. RPC 업데이트: process_withdrawal_admin (출금 승인/반려 로그)
CREATE OR REPLACE FUNCTION process_withdrawal_admin(
  p_request_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_new_balance INTEGER;
  v_company_id UUID;
BEGIN
  SELECT r.*, u.company_id INTO v_request 
  FROM withdrawal_requests r JOIN users u ON r.user_id = u.id
  WHERE r.id = p_request_id FOR UPDATE;
  
  IF v_request.status = p_status THEN
     RETURN jsonb_build_object('success', true, 'message', '이미 처리되었습니다.');
  END IF;

  IF p_status = 'paid' THEN
    UPDATE withdrawal_requests SET status = 'paid', updated_at = NOW() WHERE id = p_request_id;
    -- 이미 요청 시 차감되었으므로 추가 로그(상태 변경 안내)만 남김
    INSERT INTO public.wallet_logs (user_id, company_id, type, amount, balance_after, description, reference_id)
    VALUES (v_request.user_id, v_request.company_id, 'withdrawal_paid', 0, 0, '출금 완료 (송금 완료)', p_request_id);
    -- balance_after 0은 실제 잔액 조회를 생략하기 위함 (여기서는 잔액 변동 없음)
    -- 하지만 UI에서는 마지막 balance_after를 쓰므로 실제 잔액을 가져오면 좋음
    SELECT current_money INTO v_new_balance FROM users WHERE id = v_request.user_id;
    UPDATE wallet_logs SET balance_after = v_new_balance WHERE reference_id = p_request_id AND type = 'withdrawal_paid';

  ELSIF p_status = 'rejected' THEN
    IF v_request.status = 'pending' THEN
        UPDATE withdrawal_requests SET status = 'rejected', rejection_reason = p_reason, updated_at = NOW() WHERE id = p_request_id;
        
        -- 환불 처리
        UPDATE users SET current_money = COALESCE(current_money, 0) + v_request.amount WHERE id = v_request.user_id
        RETURNING current_money INTO v_new_balance;

        -- 환불 로그
        INSERT INTO public.wallet_logs (user_id, company_id, type, amount, balance_after, description, reference_id)
        VALUES (v_request.user_id, v_request.company_id, 'withdrawal_refund', v_request.amount, v_new_balance, '출금 반려 (환불 완료): ' || COALESCE(p_reason, '사유 없음'), p_request_id);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', '대기 중인 요청만 처리 가능합니다.');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
