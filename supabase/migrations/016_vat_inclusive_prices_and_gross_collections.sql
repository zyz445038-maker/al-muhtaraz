ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS price_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS price_includes_vat BOOLEAN;

CREATE OR REPLACE FUNCTION public.create_container_rental_contract(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_container public.containers%ROWTYPE;
    v_customer public.customers%ROWTYPE;
    v_contract public.contracts%ROWTYPE;
    v_receipt public.receipts%ROWTYPE;
    v_non_taxable NUMERIC(10, 2);
    v_subtotal NUMERIC(10, 2);
    v_vat NUMERIC(10, 2);
    v_non_taxable_paid NUMERIC(10, 2);
    v_subtotal_paid NUMERIC(10, 2);
    v_vat_paid NUMERIC(10, 2);
    v_total NUMERIC(10, 2);
    v_paid NUMERIC(10, 2);
    v_price_amount NUMERIC(10, 2);
    v_discount_amount NUMERIC(10, 2);
    v_price_includes_vat BOOLEAN;
    v_discounted_price NUMERIC(10, 2);
    v_taxable_gross NUMERIC(10, 2);
    v_initial_payment NUMERIC(10, 2);
    v_is_free BOOLEAN;
    v_use_new_price_inputs BOOLEAN;
    v_receipt_amount NUMERIC(10, 2);
    v_receipt_non_taxable NUMERIC(10, 2);
    v_receipt_subtotal NUMERIC(10, 2);
    v_receipt_vat NUMERIC(10, 2);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل إنشاء العقد.';
    END IF;

    SELECT *
    INTO v_container
    FROM public.containers
    WHERE id = NULLIF(p_payload->>'container_id', '')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحاوية غير موجودة أو لا تملك صلاحية الوصول إليها.';
    END IF;
    IF v_container.status <> 'available' THEN
        RAISE EXCEPTION 'الحاوية لم تعد متاحة للتأجير. حدّث القائمة واختر حاوية متاحة.';
    END IF;

    v_is_free := COALESCE(NULLIF(p_payload->>'is_free', '')::BOOLEAN, FALSE);
    v_use_new_price_inputs := p_payload ? 'price_amount' AND p_payload ? 'price_includes_vat';

    IF v_use_new_price_inputs THEN
        v_price_amount := COALESCE(NULLIF(p_payload->>'price_amount', '')::NUMERIC, -1);
        v_discount_amount := COALESCE(NULLIF(p_payload->>'discount_amount', '')::NUMERIC, 0);
        v_price_includes_vat := COALESCE(NULLIF(p_payload->>'price_includes_vat', '')::BOOLEAN, FALSE)
            AND NOT v_is_free;
        v_initial_payment := ROUND(COALESCE(NULLIF(p_payload->>'initial_payment_amount', '')::NUMERIC, 0), 2);

        IF v_price_amount < 0 OR v_discount_amount < 0 OR v_discount_amount > v_price_amount
           OR v_initial_payment < 0 THEN
            RAISE EXCEPTION 'السعر أو الخصم أو المبلغ المستلم غير صالح.';
        END IF;

        IF v_is_free AND (v_price_amount <> 0 OR v_discount_amount <> 0 OR v_initial_payment <> 0) THEN
            RAISE EXCEPTION 'العقد المجاني لا يجوز أن يتضمن مبلغًا أو تحصيلًا.';
        END IF;

        v_discounted_price := v_price_amount - v_discount_amount;
        v_non_taxable := 0;
        IF v_price_includes_vat THEN
            v_taxable_gross := v_discounted_price;
            v_vat := ROUND(v_taxable_gross * 15 / 115, 2);
            v_subtotal := v_taxable_gross - v_vat;
        ELSE
            v_subtotal := v_discounted_price;
            v_vat := ROUND(v_subtotal * 0.15, 2);
            v_taxable_gross := v_subtotal + v_vat;
        END IF;
        IF v_is_free THEN
            v_subtotal := 0;
            v_vat := 0;
            v_taxable_gross := 0;
        END IF;

        v_total := v_non_taxable + v_subtotal + v_vat;
        IF v_initial_payment > v_total THEN
            RAISE EXCEPTION 'المبلغ المستلم يتجاوز إجمالي العقد.';
        END IF;

        v_non_taxable_paid := 0;
        v_vat_paid := CASE
            WHEN v_taxable_gross <= 0 OR v_initial_payment >= v_taxable_gross THEN v_vat
            ELSE ROUND(v_vat * v_initial_payment / v_taxable_gross, 2)
        END;
        v_subtotal_paid := v_initial_payment - v_vat_paid;
        v_paid := v_initial_payment;

        IF ROUND(COALESCE(NULLIF(p_payload->>'total_cost', '')::NUMERIC, -1), 2) <> v_total
           OR ROUND(COALESCE(NULLIF(p_payload->>'paid_amount', '')::NUMERIC, -1), 2) <> v_paid
           OR ROUND(COALESCE(NULLIF(p_payload->>'subtotal_amount', '')::NUMERIC, -1), 2) <> v_subtotal
           OR ROUND(COALESCE(NULLIF(p_payload->>'vat_amount', '')::NUMERIC, -1), 2) <> v_vat
           OR ROUND(COALESCE(NULLIF(p_payload->>'subtotal_paid_amount', '')::NUMERIC, -1), 2) <> v_subtotal_paid
           OR ROUND(COALESCE(NULLIF(p_payload->>'vat_paid_amount', '')::NUMERIC, -1), 2) <> v_vat_paid THEN
            RAISE EXCEPTION 'القيم المالية المحسوبة في التطبيق لا تطابق السعر والخصم والتحصيل.';
        END IF;
    ELSE
        v_price_amount := NULL;
        v_discount_amount := NULL;
        v_price_includes_vat := NULL;
        v_non_taxable := COALESCE(NULLIF(p_payload->>'non_taxable_amount', '')::NUMERIC, 0);
        v_subtotal := COALESCE(NULLIF(p_payload->>'subtotal_amount', '')::NUMERIC, 0);
        v_vat := COALESCE(NULLIF(p_payload->>'vat_amount', '')::NUMERIC, 0);
        v_non_taxable_paid := COALESCE(NULLIF(p_payload->>'non_taxable_paid_amount', '')::NUMERIC, 0);
        v_subtotal_paid := COALESCE(NULLIF(p_payload->>'subtotal_paid_amount', '')::NUMERIC, 0);
        v_vat_paid := COALESCE(NULLIF(p_payload->>'vat_paid_amount', '')::NUMERIC, 0);
        v_total := COALESCE(NULLIF(p_payload->>'total_cost', '')::NUMERIC, 0);
        v_paid := COALESCE(NULLIF(p_payload->>'paid_amount', '')::NUMERIC, 0);

        IF LEAST(v_non_taxable, v_subtotal, v_vat, v_non_taxable_paid, v_subtotal_paid, v_vat_paid, v_total, v_paid) < 0
           OR v_vat <> ROUND(v_subtotal * 0.15, 2)
           OR v_total <> v_non_taxable + v_subtotal + v_vat
           OR v_paid <> v_non_taxable_paid + v_subtotal_paid + v_vat_paid
           OR v_non_taxable_paid > v_non_taxable
           OR v_subtotal_paid > v_subtotal
           OR v_vat_paid > v_vat
           OR (v_subtotal = 0 AND v_vat_paid <> 0)
           OR (v_subtotal_paid < v_subtotal AND v_vat_paid <> ROUND(v_vat * v_subtotal_paid / NULLIF(v_subtotal, 0), 2))
           OR (v_subtotal_paid = v_subtotal AND v_vat_paid <> v_vat) THEN
            RAISE EXCEPTION 'تفاصيل العقد المالية أو توزيع الضريبة غير متطابقة.';
        END IF;
    END IF;

    INSERT INTO public.customers (name, phone, vat_number, customer_type, address)
    VALUES (
        NULLIF(TRIM(p_payload->>'customer_name'), ''),
        NULLIF(TRIM(p_payload->>'customer_phone'), ''),
        NULLIF(TRIM(p_payload->>'customer_vat_number'), ''),
        COALESCE(NULLIF(p_payload->>'customer_type', ''), 'individual'),
        NULLIF(TRIM(p_payload->>'location_address'), '')
    )
    RETURNING * INTO v_customer;

    INSERT INTO public.contracts (
        contract_number, customer_id, container_id, contract_type, period_type,
        duration_days, start_date, end_date, expected_pickup_time,
        location_latitude, location_longitude, google_maps_url, location_address,
        total_cost, paid_amount, price_amount, discount_amount, price_includes_vat,
        non_taxable_amount, subtotal_amount, vat_amount,
        non_taxable_paid_amount, subtotal_paid_amount, vat_paid_amount,
        payment_status, status, created_by_employee_id, assigned_employee_id,
        notes, receipt_number, payment_method, is_free
    )
    VALUES (
        NULLIF(TRIM(p_payload->>'contract_number'), ''),
        v_customer.id,
        v_container.id,
        p_payload->>'contract_type',
        p_payload->>'period_type',
        NULLIF(p_payload->>'duration_days', '')::INTEGER,
        (p_payload->>'start_date')::TIMESTAMPTZ,
        (p_payload->>'end_date')::TIMESTAMPTZ,
        NULLIF(p_payload->>'expected_pickup_time', '')::TIMESTAMPTZ,
        NULLIF(p_payload->>'location_latitude', '')::DOUBLE PRECISION,
        NULLIF(p_payload->>'location_longitude', '')::DOUBLE PRECISION,
        NULLIF(p_payload->>'google_maps_url', ''),
        NULLIF(p_payload->>'location_address', ''),
        v_total,
        v_paid,
        v_price_amount,
        v_discount_amount,
        v_price_includes_vat,
        v_non_taxable,
        v_subtotal,
        v_vat,
        v_non_taxable_paid,
        v_subtotal_paid,
        v_vat_paid,
        CASE WHEN v_paid >= v_total THEN 'paid'
             WHEN v_paid > 0 THEN 'partially_paid'
             ELSE 'unpaid' END,
        'active',
        auth.uid(),
        NULLIF(p_payload->>'assigned_employee_id', '')::UUID,
        NULLIF(p_payload->>'notes', ''),
        NULLIF(p_payload->>'receipt_number', ''),
        NULLIF(p_payload->>'payment_method', ''),
        v_is_free
    )
    RETURNING * INTO v_contract;

    IF v_contract.receipt_number IS NOT NULL THEN
        v_receipt_amount := COALESCE(NULLIF(p_payload->>'receipt_amount', '')::NUMERIC, 0);
        v_receipt_non_taxable := COALESCE(NULLIF(p_payload->>'receipt_non_taxable_amount', '')::NUMERIC, 0);
        v_receipt_subtotal := COALESCE(NULLIF(p_payload->>'receipt_subtotal_amount', '')::NUMERIC, 0);
        v_receipt_vat := COALESCE(NULLIF(p_payload->>'receipt_vat_amount', '')::NUMERIC, 0);
        IF v_receipt_amount <> v_receipt_non_taxable + v_receipt_subtotal + v_receipt_vat
           OR (v_use_new_price_inputs AND (
               v_receipt_amount <> v_paid
               OR v_receipt_non_taxable <> v_non_taxable_paid
               OR v_receipt_subtotal <> v_subtotal_paid
               OR v_receipt_vat <> v_vat_paid
           )) THEN
            RAISE EXCEPTION 'إجمالي سند القبض لا يطابق المبلغ المستلم ومكوناته المالية.';
        END IF;

        INSERT INTO public.receipts (
            receipt_number, contract_id, customer_id, amount, non_taxable_amount,
            subtotal_amount, vat_amount, payment_method, received_by_employee_id, notes
        )
        VALUES (
            v_contract.receipt_number, v_contract.id, v_customer.id,
            v_receipt_amount, v_receipt_non_taxable, v_receipt_subtotal, v_receipt_vat,
            p_payload->>'payment_method', auth.uid(), NULLIF(p_payload->>'receipt_notes', '')
        )
        RETURNING * INTO v_receipt;
    END IF;

    UPDATE public.containers
    SET status = 'rented'
    WHERE id = v_container.id
    RETURNING * INTO v_container;

    RETURN JSONB_BUILD_OBJECT(
        'customer', TO_JSONB(v_customer),
        'contract', TO_JSONB(v_contract),
        'container', TO_JSONB(v_container),
        'receipt', CASE WHEN v_receipt.id IS NULL THEN NULL ELSE TO_JSONB(v_receipt) END
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_contract_payment_actual(
    p_contract_id UUID,
    p_amount_received NUMERIC,
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
    v_non_taxable NUMERIC(10, 2);
    v_subtotal NUMERIC(10, 2);
    v_vat NUMERIC(10, 2);
    v_non_taxable_paid NUMERIC(10, 2);
    v_subtotal_paid NUMERIC(10, 2);
    v_vat_paid NUMERIC(10, 2);
    v_non_taxable_due NUMERIC(10, 2);
    v_taxable_gross NUMERIC(10, 2);
    v_taxable_gross_paid NUMERIC(10, 2);
    v_taxable_gross_now NUMERIC(10, 2);
    v_new_taxable_gross_paid NUMERIC(10, 2);
    v_non_taxable_now NUMERIC(10, 2);
    v_subtotal_now NUMERIC(10, 2);
    v_vat_now NUMERIC(10, 2);
    v_new_subtotal_paid NUMERIC(10, 2);
    v_target_vat_paid NUMERIC(10, 2);
    v_entered NUMERIC(10, 2);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل تسجيل التحصيل.';
    END IF;
    IF p_amount_received IS NULL OR p_amount_received <= 0 THEN
        RAISE EXCEPTION 'مبلغ التحصيل غير صالح.';
    END IF;
    IF p_payment_method IS NULL OR p_payment_method NOT IN ('cash', 'pos', 'bank_transfer') THEN
        RAISE EXCEPTION 'طريقة التحصيل غير صالحة.';
    END IF;
    IF NULLIF(TRIM(p_receipt_number), '') IS NULL THEN
        RAISE EXCEPTION 'رقم سند القبض مطلوب.';
    END IF;

    v_entered := ROUND(p_amount_received, 2);
    IF v_entered <= 0 THEN
        RAISE EXCEPTION 'مبلغ التحصيل يجب ألا يقل عن هللة واحدة.';
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
    IF v_non_taxable + v_subtotal + v_vat <> v_contract.total_cost
       OR v_non_taxable_paid + v_subtotal_paid + v_vat_paid <> v_contract.paid_amount THEN
        RAISE EXCEPTION 'مكونات الرصيد لا تطابق إجمالي العقد أو إجمالي المبالغ المحصلة.';
    END IF;
    v_non_taxable_due := GREATEST(0, v_non_taxable - v_non_taxable_paid);
    v_taxable_gross := v_subtotal + v_vat;
    v_taxable_gross_paid := v_subtotal_paid + v_vat_paid;
    IF v_entered > v_non_taxable_due + GREATEST(0, v_taxable_gross - v_taxable_gross_paid) THEN
        RAISE EXCEPTION 'المبلغ المستلم يتجاوز الرصيد الإجمالي المتبقي.';
    END IF;

    v_non_taxable_now := LEAST(v_entered, v_non_taxable_due);
    v_taxable_gross_now := v_entered - v_non_taxable_now;
    v_new_taxable_gross_paid := v_taxable_gross_paid + v_taxable_gross_now;
    v_target_vat_paid := CASE
        WHEN v_taxable_gross <= 0 OR v_new_taxable_gross_paid >= v_taxable_gross THEN v_vat
        ELSE GREATEST(
            v_vat_paid,
            LEAST(v_vat, ROUND(v_vat * v_new_taxable_gross_paid / v_taxable_gross, 2))
        )
    END;
    v_new_subtotal_paid := v_new_taxable_gross_paid - v_target_vat_paid;
    v_subtotal_now := v_new_subtotal_paid - v_subtotal_paid;
    v_vat_now := v_target_vat_paid - v_vat_paid;

    IF v_non_taxable_now + v_subtotal_now + v_vat_now <> v_entered
       OR v_subtotal_now < 0 OR v_vat_now < 0 THEN
        RAISE EXCEPTION 'تعذر توزيع مبلغ التحصيل على مكونات الرصيد بدقة.';
    END IF;

    UPDATE public.contracts
    SET non_taxable_amount = v_non_taxable,
        subtotal_amount = v_subtotal,
        vat_amount = v_vat,
        non_taxable_paid_amount = v_non_taxable_paid + v_non_taxable_now,
        subtotal_paid_amount = v_new_subtotal_paid,
        vat_paid_amount = v_target_vat_paid,
        paid_amount = paid_amount + v_entered,
        payment_status = CASE
            WHEN paid_amount + v_entered >= total_cost THEN 'paid'
            WHEN paid_amount + v_entered > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END,
        payment_method = p_payment_method,
        receipt_number = TRIM(p_receipt_number)
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;

    INSERT INTO public.receipts (
        receipt_number, contract_id, customer_id, amount, non_taxable_amount,
        subtotal_amount, vat_amount, payment_method, received_by_employee_id, notes
    )
    VALUES (
        TRIM(p_receipt_number), v_contract.id, v_contract.customer_id,
        v_entered, v_non_taxable_now, v_subtotal_now, v_vat_now,
        p_payment_method, auth.uid(), NULLIF(TRIM(p_receipt_notes), '')
    )
    RETURNING * INTO v_receipt;

    RETURN JSONB_BUILD_OBJECT('contract', TO_JSONB(v_contract), 'receipt', TO_JSONB(v_receipt));
END;
$$;

REVOKE ALL ON FUNCTION public.record_contract_payment_actual(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_contract_payment_actual(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

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
    v_paid_vat_old_expected NUMERIC(10, 2);
    v_paid_vat_gross_expected NUMERIC(10, 2);
    v_receipt_required BOOLEAN;
    v_receipt_method TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل تمديد العقد.';
    END IF;
    IF p_additional_days IS NULL OR p_additional_days <= 0
       OR p_additional_subtotal IS NULL OR p_additional_subtotal < 0
       OR p_additional_vat IS NULL
       OR (
           p_additional_vat <> ROUND(p_additional_subtotal * 0.15, 2)
           AND p_additional_vat <> ROUND((p_additional_subtotal + p_additional_vat) * 15 / 115, 2)
       )
       OR p_paid_subtotal IS NULL OR p_paid_subtotal < 0 OR p_paid_subtotal > p_additional_subtotal
       OR p_paid_vat IS NULL OR p_paid_vat < 0 OR p_paid_vat > p_additional_vat
       OR p_new_end_date IS NULL THEN
        RAISE EXCEPTION 'قيمة التمديد أو توزيع الضريبة والدفعة غير صالح.';
    END IF;
    IF p_payment_choice IS NULL OR p_payment_choice NOT IN ('cash', 'bank_transfer', 'sadad', 'postpaid') THEN
        RAISE EXCEPTION 'طريقة الدفع للتمديد غير صالحة.';
    END IF;

    v_paid_vat_old_expected := CASE
        WHEN p_additional_subtotal <= 0 OR p_paid_subtotal >= p_additional_subtotal THEN p_additional_vat
        ELSE ROUND(p_additional_vat * p_paid_subtotal / p_additional_subtotal, 2)
    END;
    v_paid_vat_gross_expected := CASE
        WHEN p_additional_subtotal + p_additional_vat <= 0
             OR p_paid_subtotal + p_paid_vat >= p_additional_subtotal + p_additional_vat THEN p_additional_vat
        ELSE ROUND(
            p_additional_vat * (p_paid_subtotal + p_paid_vat)
            / (p_additional_subtotal + p_additional_vat),
            2
        )
    END;
    IF p_paid_vat <> v_paid_vat_old_expected AND p_paid_vat <> v_paid_vat_gross_expected THEN
        RAISE EXCEPTION 'ضريبة دفعة التمديد لا تطابق المبلغ المسدد.';
    END IF;

    v_receipt_required := p_payment_choice IN ('cash', 'bank_transfer') OR p_paid_subtotal + p_paid_vat > 0;
    IF v_receipt_required AND (
        NULLIF(TRIM(p_receipt_number), '') IS NULL
        OR p_receipt_amount IS NULL
        OR p_receipt_non_taxable_amount IS NULL
        OR p_receipt_subtotal_amount IS NULL
        OR p_receipt_vat_amount IS NULL
        OR p_receipt_amount <> p_receipt_non_taxable_amount + p_receipt_subtotal_amount + p_receipt_vat_amount
        OR p_receipt_non_taxable_amount <> 0
        OR p_receipt_subtotal_amount <> p_paid_subtotal
        OR p_receipt_vat_amount <> p_paid_vat
    ) THEN
        RAISE EXCEPTION 'بيانات سند قبض التمديد غير مكتملة أو غير متطابقة.';
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
    v_non_taxable_paid := COALESCE(v_contract.non_taxable_paid_amount, v_contract.paid_amount);
    v_subtotal_paid := COALESCE(v_contract.subtotal_paid_amount, 0);
    v_vat_paid := COALESCE(v_contract.vat_paid_amount, 0);
    v_receipt_method := CASE
        WHEN p_payment_choice = 'cash' THEN 'cash'
        WHEN p_payment_choice = 'bank_transfer' THEN 'bank_transfer'
        ELSE 'mada'
    END;

    UPDATE public.contracts
    SET duration_days = COALESCE(duration_days, 1) + p_additional_days,
        end_date = p_new_end_date,
        expected_pickup_time = p_new_end_date,
        total_cost = v_non_taxable + v_subtotal + p_additional_subtotal + v_vat + p_additional_vat,
        paid_amount = v_non_taxable_paid + v_subtotal_paid + p_paid_subtotal + v_vat_paid + p_paid_vat,
        non_taxable_amount = v_non_taxable,
        subtotal_amount = v_subtotal + p_additional_subtotal,
        vat_amount = v_vat + p_additional_vat,
        non_taxable_paid_amount = v_non_taxable_paid,
        subtotal_paid_amount = v_subtotal_paid + p_paid_subtotal,
        vat_paid_amount = v_vat_paid + p_paid_vat,
        payment_status = CASE
            WHEN v_non_taxable_paid + v_subtotal_paid + p_paid_subtotal + v_vat_paid + p_paid_vat
                 >= v_non_taxable + v_subtotal + p_additional_subtotal + v_vat + p_additional_vat THEN 'paid'
            WHEN v_non_taxable_paid + v_subtotal_paid + p_paid_subtotal + v_vat_paid + p_paid_vat > 0 THEN 'partially_paid'
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
            p_receipt_amount, p_receipt_non_taxable_amount, p_receipt_subtotal_amount,
            p_receipt_vat_amount, v_receipt_method, auth.uid(),
            NULLIF(TRIM(p_receipt_notes), '')
        )
        RETURNING * INTO v_receipt;
    END IF;

    RETURN JSONB_BUILD_OBJECT(
        'contract', TO_JSONB(v_contract),
        'receipt', CASE WHEN v_receipt.id IS NULL THEN NULL ELSE TO_JSONB(v_receipt) END
    );
END;
$$;
