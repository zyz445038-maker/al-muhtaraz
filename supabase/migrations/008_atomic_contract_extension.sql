CREATE OR REPLACE FUNCTION public.extend_container_rental_contract(
    p_contract_id UUID,
    p_additional_days INTEGER,
    p_additional_cost NUMERIC,
    p_new_end_date TIMESTAMPTZ,
    p_paid_amount NUMERIC,
    p_payment_choice TEXT,
    p_extension_notes TEXT,
    p_receipt_number TEXT,
    p_receipt_amount NUMERIC,
    p_receipt_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_contract public.contracts%ROWTYPE;
    v_receipt public.receipts%ROWTYPE;
    v_new_total NUMERIC(10, 2);
    v_new_paid NUMERIC(10, 2);
    v_receipt_required BOOLEAN;
    v_receipt_method TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل تمديد العقد.';
    END IF;

    IF p_additional_days IS NULL OR p_additional_days <= 0 THEN
        RAISE EXCEPTION 'يجب أن تكون مدة التمديد أكبر من صفر.';
    END IF;

    IF p_additional_cost IS NULL OR p_additional_cost < 0 THEN
        RAISE EXCEPTION 'قيمة التمديد غير صالحة.';
    END IF;

    IF p_paid_amount IS NULL OR p_paid_amount < 0 OR p_paid_amount > p_additional_cost THEN
        RAISE EXCEPTION 'مبلغ الدفعة غير صالح.';
    END IF;

    IF p_payment_choice IS NULL OR p_payment_choice NOT IN ('cash', 'sadad', 'postpaid') THEN
        RAISE EXCEPTION 'طريقة الدفع للتمديد غير صالحة.';
    END IF;

    IF p_new_end_date IS NULL THEN
        RAISE EXCEPTION 'تاريخ انتهاء التمديد مطلوب.';
    END IF;

    v_receipt_required := p_payment_choice = 'cash' OR p_paid_amount > 0;
    IF v_receipt_required AND (
        NULLIF(trim(p_receipt_number), '') IS NULL
        OR p_receipt_amount IS NULL
        OR p_receipt_amount < 0
        OR p_receipt_amount <> p_paid_amount
    ) THEN
        RAISE EXCEPTION 'بيانات سند قبض التمديد غير مكتملة.';
    END IF;

    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'العقد غير موجود أو لا تملك صلاحية الوصول إليه.';
    END IF;

    v_new_total := v_contract.total_cost + p_additional_cost;
    v_new_paid := v_contract.paid_amount + p_paid_amount;
    v_receipt_method := CASE
        WHEN p_payment_choice = 'cash' THEN 'cash'
        ELSE 'mada'
    END;

    UPDATE public.contracts
    SET duration_days = COALESCE(duration_days, 1) + p_additional_days,
        end_date = p_new_end_date,
        expected_pickup_time = p_new_end_date,
        total_cost = v_new_total,
        paid_amount = v_new_paid,
        payment_status = CASE
            WHEN v_new_paid >= v_new_total THEN 'paid'
            WHEN v_new_paid > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END,
        payment_method = CASE
            WHEN v_receipt_required THEN v_receipt_method
            ELSE payment_method
        END,
        receipt_number = CASE
            WHEN v_receipt_required THEN trim(p_receipt_number)
            ELSE receipt_number
        END,
        status = 'extended',
        notes = CASE
            WHEN NULLIF(trim(p_extension_notes), '') IS NULL THEN notes
            WHEN NULLIF(trim(notes), '') IS NULL THEN trim(p_extension_notes)
            ELSE notes || ' | ' || trim(p_extension_notes)
        END
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;

    IF v_receipt_required THEN
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
            p_receipt_amount,
            v_receipt_method,
            auth.uid(),
            NULLIF(trim(p_receipt_notes), '')
        )
        RETURNING * INTO v_receipt;
    END IF;

    RETURN jsonb_build_object(
        'contract', to_jsonb(v_contract),
        'receipt', CASE
            WHEN v_receipt.id IS NULL THEN NULL
            ELSE to_jsonb(v_receipt)
        END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.extend_container_rental_contract(
    UUID, INTEGER, NUMERIC, TIMESTAMPTZ, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extend_container_rental_contract(
    UUID, INTEGER, NUMERIC, TIMESTAMPTZ, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT
) TO authenticated;
