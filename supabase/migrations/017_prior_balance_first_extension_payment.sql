CREATE OR REPLACE FUNCTION public.extend_container_rental_contract_vat(
    p_contract_id UUID,
    p_additional_days INTEGER,
    p_additional_subtotal NUMERIC,
    p_additional_vat NUMERIC,
    p_new_end_date TIMESTAMPTZ,
    p_paid_subtotal NUMERIC,
    p_paid_vat NUMERIC,
    p_payment_choice TEXT,
    p_extension_notes TEXT,
    p_receipt_number TEXT,
    p_receipt_amount NUMERIC,
    p_receipt_non_taxable_amount NUMERIC,
    p_receipt_subtotal_amount NUMERIC,
    p_receipt_vat_amount NUMERIC,
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
    v_non_taxable NUMERIC(10, 2);
    v_subtotal NUMERIC(10, 2);
    v_vat NUMERIC(10, 2);
    v_non_taxable_paid NUMERIC(10, 2);
    v_subtotal_paid NUMERIC(10, 2);
    v_vat_paid NUMERIC(10, 2);
    v_non_taxable_due NUMERIC(10, 2);
    v_old_taxable_gross NUMERIC(10, 2);
    v_old_taxable_paid_gross NUMERIC(10, 2);
    v_old_taxable_due NUMERIC(10, 2);
    v_old_taxable_received NUMERIC(10, 2);
    v_old_new_taxable_paid_gross NUMERIC(10, 2);
    v_old_target_vat_paid NUMERIC(10, 2);
    v_old_subtotal_now NUMERIC(10, 2);
    v_old_vat_now NUMERIC(10, 2);
    v_non_taxable_now NUMERIC(10, 2);
    v_extension_gross NUMERIC(10, 2);
    v_extension_gross_now NUMERIC(10, 2);
    v_extension_new_gross_paid NUMERIC(10, 2);
    v_extension_target_vat_paid NUMERIC(10, 2);
    v_extension_subtotal_now NUMERIC(10, 2);
    v_extension_vat_now NUMERIC(10, 2);
    v_amount_received NUMERIC(10, 2);
    v_receipt_required BOOLEAN;
    v_receipt_method TEXT;
    v_new_non_taxable_paid NUMERIC(10, 2);
    v_new_subtotal_paid NUMERIC(10, 2);
    v_new_vat_paid NUMERIC(10, 2);
    v_new_total_cost NUMERIC(10, 2);
    v_new_paid_amount NUMERIC(10, 2);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل تمديد العقد.';
    END IF;
    IF p_additional_days IS NULL OR p_additional_days <= 0
       OR p_additional_subtotal IS NULL OR p_additional_subtotal < 0
       OR p_additional_vat IS NULL OR p_additional_vat < 0
       OR (
           p_additional_vat <> ROUND(p_additional_subtotal * 0.15, 2)
           AND p_additional_vat <> ROUND((p_additional_subtotal + p_additional_vat) * 15 / 115, 2)
       )
       OR p_paid_subtotal IS NULL OR p_paid_subtotal < 0
       OR p_paid_vat IS NULL OR p_paid_vat < 0
       OR p_new_end_date IS NULL THEN
        RAISE EXCEPTION 'قيمة التمديد أو توزيع الضريبة والدفعة غير صالح.';
    END IF;
    IF p_payment_choice IS NULL OR p_payment_choice NOT IN ('cash', 'bank_transfer', 'sadad', 'postpaid') THEN
        RAISE EXCEPTION 'طريقة الدفع للتمديد غير صالحة.';
    END IF;
    IF p_receipt_amount IS NOT NULL AND p_receipt_amount < 0 THEN
        RAISE EXCEPTION 'مبلغ سند القبض غير صالح.';
    END IF;

    SELECT * INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'العقد غير موجود أو لا تملك صلاحية الوصول إليه.';
    END IF;

    v_non_taxable := COALESCE(v_contract.non_taxable_amount, v_contract.total_cost);
    v_subtotal := COALESCE(v_contract.subtotal_amount, 0);
    v_vat := COALESCE(v_contract.vat_amount, 0);
    v_non_taxable_paid := COALESCE(
        v_contract.non_taxable_paid_amount,
        CASE WHEN v_contract.subtotal_amount IS NULL THEN v_contract.paid_amount
             ELSE GREATEST(0, v_contract.paid_amount - COALESCE(v_contract.subtotal_paid_amount, 0) - COALESCE(v_contract.vat_paid_amount, 0)) END
    );
    v_subtotal_paid := COALESCE(v_contract.subtotal_paid_amount, 0);
    v_vat_paid := COALESCE(v_contract.vat_paid_amount, 0);

    IF v_non_taxable < 0 OR v_subtotal < 0 OR v_vat < 0
       OR v_non_taxable_paid < 0 OR v_subtotal_paid < 0 OR v_vat_paid < 0
       OR v_non_taxable_paid > v_non_taxable
       OR v_subtotal_paid > v_subtotal
       OR v_vat_paid > v_vat
       OR v_non_taxable + v_subtotal + v_vat <> v_contract.total_cost
       OR v_non_taxable_paid + v_subtotal_paid + v_vat_paid <> v_contract.paid_amount THEN
        RAISE EXCEPTION 'مكونات الرصيد لا تطابق إجمالي العقد أو المبالغ المحصلة.';
    END IF;

    v_amount_received := COALESCE(ROUND(p_receipt_amount, 2), 0);
    v_non_taxable_due := v_non_taxable - v_non_taxable_paid;
    v_old_taxable_gross := v_subtotal + v_vat;
    v_old_taxable_paid_gross := v_subtotal_paid + v_vat_paid;
    v_old_taxable_due := v_old_taxable_gross - v_old_taxable_paid_gross;

    v_non_taxable_now := LEAST(v_amount_received, v_non_taxable_due);
    v_old_taxable_received := LEAST(
        v_amount_received - v_non_taxable_now,
        v_old_taxable_due
    );
    v_old_new_taxable_paid_gross := v_old_taxable_paid_gross + v_old_taxable_received;
    v_old_target_vat_paid := CASE
        WHEN v_old_taxable_gross <= 0 OR v_old_new_taxable_paid_gross >= v_old_taxable_gross THEN v_vat
        ELSE GREATEST(
            v_vat_paid,
            LEAST(v_vat, ROUND(v_vat * v_old_new_taxable_paid_gross / v_old_taxable_gross, 2))
        )
    END;
    v_old_vat_now := v_old_target_vat_paid - v_vat_paid;
    v_old_subtotal_now := v_old_taxable_received - v_old_vat_now;

    v_extension_gross := p_additional_subtotal + p_additional_vat;
    v_extension_gross_now := v_amount_received
        - v_non_taxable_now
        - v_old_taxable_received;
    IF v_extension_gross_now > v_extension_gross THEN
        RAISE EXCEPTION 'المبلغ المستلم يتجاوز إجمالي الرصيد السابق والتمديد.';
    END IF;
    v_extension_new_gross_paid := v_extension_gross_now;
    v_extension_target_vat_paid := CASE
        WHEN v_extension_gross <= 0 OR v_extension_new_gross_paid >= v_extension_gross THEN p_additional_vat
        ELSE ROUND(p_additional_vat * v_extension_new_gross_paid / v_extension_gross, 2)
    END;
    v_extension_vat_now := v_extension_target_vat_paid;
    v_extension_subtotal_now := v_extension_gross_now - v_extension_vat_now;

    IF v_old_subtotal_now < 0
       OR v_old_vat_now < 0 THEN
        RAISE EXCEPTION 'تعذر توزيع الدفعة على الرصيد السابق والتمديد.';
    END IF;

    v_receipt_required := p_payment_choice IN ('cash', 'bank_transfer') OR v_amount_received > 0;
    IF v_receipt_required AND (
        NULLIF(TRIM(p_receipt_number), '') IS NULL
        OR p_receipt_amount IS NULL
        OR ROUND(p_receipt_amount, 2) <> v_amount_received
    ) THEN
        RAISE EXCEPTION 'بيانات سند قبض التمديد غير مكتملة أو غير صالحة.';
    END IF;

    v_receipt_method := CASE
        WHEN p_payment_choice = 'cash' THEN 'cash'
        WHEN p_payment_choice = 'bank_transfer' THEN 'bank_transfer'
        ELSE 'mada'
    END;
    v_new_non_taxable_paid := v_non_taxable_paid + v_non_taxable_now;
    v_new_subtotal_paid := v_subtotal_paid + v_old_subtotal_now + v_extension_subtotal_now;
    v_new_vat_paid := v_vat_paid + v_old_vat_now + v_extension_vat_now;
    v_new_total_cost := v_non_taxable + v_subtotal + p_additional_subtotal + v_vat + p_additional_vat;
    v_new_paid_amount := v_new_non_taxable_paid + v_new_subtotal_paid + v_new_vat_paid;

    UPDATE public.contracts
    SET duration_days = COALESCE(duration_days, 1) + p_additional_days,
        end_date = p_new_end_date,
        expected_pickup_time = p_new_end_date,
        total_cost = v_new_total_cost,
        paid_amount = v_new_paid_amount,
        non_taxable_amount = v_non_taxable,
        subtotal_amount = v_subtotal + p_additional_subtotal,
        vat_amount = v_vat + p_additional_vat,
        non_taxable_paid_amount = v_new_non_taxable_paid,
        subtotal_paid_amount = v_new_subtotal_paid,
        vat_paid_amount = v_new_vat_paid,
        payment_status = CASE
            WHEN v_new_paid_amount >= v_new_total_cost THEN 'paid'
            WHEN v_new_paid_amount > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END,
        payment_method = CASE WHEN v_receipt_required THEN v_receipt_method ELSE payment_method END,
        receipt_number = CASE WHEN v_receipt_required THEN TRIM(p_receipt_number) ELSE receipt_number END,
        status = 'extended',
        notes = CASE
            WHEN NULLIF(TRIM(p_extension_notes), '') IS NULL THEN notes
            WHEN NULLIF(TRIM(notes), '') IS NULL THEN TRIM(p_extension_notes)
            ELSE notes || ' | ' || TRIM(p_extension_notes)
        END
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;

    IF v_receipt_required THEN
        INSERT INTO public.receipts (
            receipt_number, contract_id, customer_id, amount, non_taxable_amount,
            subtotal_amount, vat_amount, payment_method, received_by_employee_id, notes
        )
        VALUES (
            TRIM(p_receipt_number), v_contract.id, v_contract.customer_id,
            v_amount_received, v_non_taxable_now,
            v_old_subtotal_now + v_extension_subtotal_now,
            v_old_vat_now + v_extension_vat_now,
            v_receipt_method, auth.uid(), NULLIF(TRIM(p_receipt_notes), '')
        )
        RETURNING * INTO v_receipt;
    END IF;

    RETURN JSONB_BUILD_OBJECT(
        'contract', TO_JSONB(v_contract),
        'receipt', CASE WHEN v_receipt.id IS NULL THEN NULL ELSE TO_JSONB(v_receipt) END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.extend_container_rental_contract_vat(
    UUID, INTEGER, NUMERIC, NUMERIC, TIMESTAMPTZ, NUMERIC, NUMERIC, TEXT,
    TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_container_rental_contract_vat(
    UUID, INTEGER, NUMERIC, NUMERIC, TIMESTAMPTZ, NUMERIC, NUMERIC, TEXT,
    TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT
) TO authenticated;
