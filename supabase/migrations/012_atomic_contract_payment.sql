CREATE OR REPLACE FUNCTION public.record_contract_payment(
    p_contract_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_receipt_number TEXT,
    p_receipt_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_contract public.contracts%ROWTYPE;
    v_receipt public.receipts%ROWTYPE;
    v_remaining NUMERIC(10, 2);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل تسجيل التحصيل.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'مبلغ التحصيل غير صالح.';
    END IF;

    IF p_payment_method IS NULL OR p_payment_method NOT IN ('cash', 'pos', 'bank_transfer') THEN
        RAISE EXCEPTION 'طريقة التحصيل غير صالحة.';
    END IF;

    IF NULLIF(trim(p_receipt_number), '') IS NULL THEN
        RAISE EXCEPTION 'رقم الفاتورة مطلوب.';
    END IF;

    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'العقد غير موجود أو لا تملك صلاحية الوصول إليه.';
    END IF;

    v_remaining := v_contract.total_cost - v_contract.paid_amount;
    IF v_remaining <= 0 THEN
        RAISE EXCEPTION 'لا يوجد مبلغ متبقٍ للتحصيل على هذا العقد.';
    END IF;

    IF p_amount > v_remaining THEN
        RAISE EXCEPTION 'مبلغ التحصيل أكبر من المبلغ المتبقي على العقد (%).', v_remaining;
    END IF;

    UPDATE public.contracts
    SET paid_amount = paid_amount + p_amount,
        payment_status = CASE
            WHEN paid_amount + p_amount >= total_cost THEN 'paid'
            WHEN paid_amount + p_amount > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END,
        payment_method = p_payment_method,
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
        p_amount,
        p_payment_method,
        auth.uid(),
        NULLIF(trim(p_receipt_notes), '')
    )
    RETURNING * INTO v_receipt;

    RETURN jsonb_build_object(
        'contract', to_jsonb(v_contract),
        'receipt', to_jsonb(v_receipt)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_contract_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_contract_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
