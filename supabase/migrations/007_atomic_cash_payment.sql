CREATE OR REPLACE FUNCTION public.record_cash_contract_payment(
    p_contract_id UUID,
    p_receipt_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_contract public.contracts%ROWTYPE;
    v_receipt public.receipts%ROWTYPE;
    v_amount NUMERIC(10, 2);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل تسجيل التحصيل النقدي.';
    END IF;

    IF NULLIF(trim(p_receipt_number), '') IS NULL THEN
        RAISE EXCEPTION 'رقم سند القبض مطلوب.';
    END IF;

    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'العقد غير موجود أو لا تملك صلاحية الوصول إليه.';
    END IF;

    v_amount := v_contract.total_cost - v_contract.paid_amount;
    IF v_amount <= 0 THEN
        RAISE EXCEPTION 'لا يوجد مبلغ متبقٍ للتحصيل على هذا العقد.';
    END IF;

    UPDATE public.contracts
    SET paid_amount = total_cost,
        payment_status = 'paid',
        payment_method = 'cash',
        receipt_number = trim(p_receipt_number)
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;

    INSERT INTO public.receipts (
        receipt_number,
        contract_id,
        customer_id,
        amount,
        payment_method,
        received_by_employee_id,
        notes
    )
    VALUES (
        trim(p_receipt_number),
        v_contract.id,
        v_contract.customer_id,
        v_amount,
        'cash',
        auth.uid(),
        'تم الاستلام نقداً (كاش في الموقع)'
    )
    RETURNING * INTO v_receipt;

    RETURN jsonb_build_object(
        'contract', to_jsonb(v_contract),
        'receipt', to_jsonb(v_receipt)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_cash_contract_payment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_cash_contract_payment(UUID, TEXT) TO authenticated;
