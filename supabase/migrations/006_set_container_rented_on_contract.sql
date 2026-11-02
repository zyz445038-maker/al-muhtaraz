CREATE OR REPLACE FUNCTION public.create_container_rental_contract(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_container public.containers%ROWTYPE;
    v_customer public.customers%ROWTYPE;
    v_contract public.contracts%ROWTYPE;
    v_receipt public.receipts%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل إنشاء العقد.';
    END IF;

    SELECT *
    INTO v_container
    FROM public.containers
    WHERE id = NULLIF(p_payload->>'container_id', '')::uuid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحاوية غير موجودة أو لا تملك صلاحية الوصول إليها.';
    END IF;

    IF v_container.status <> 'available' THEN
        RAISE EXCEPTION 'الحاوية لم تعد متاحة للتأجير. حدّث القائمة واختر حاوية أخرى.';
    END IF;

    INSERT INTO public.customers (name, phone, customer_type, address)
    VALUES (
        NULLIF(trim(p_payload->>'customer_name'), ''),
        NULLIF(trim(p_payload->>'customer_phone'), ''),
        COALESCE(NULLIF(p_payload->>'customer_type', ''), 'individual'),
        NULLIF(trim(p_payload->>'location_address'), '')
    )
    RETURNING * INTO v_customer;

    INSERT INTO public.contracts (
        contract_number,
        customer_id,
        container_id,
        contract_type,
        period_type,
        duration_days,
        start_date,
        end_date,
        expected_pickup_time,
        location_latitude,
        location_longitude,
        google_maps_url,
        location_address,
        total_cost,
        paid_amount,
        payment_status,
        status,
        created_by_employee_id,
        assigned_employee_id,
        notes,
        receipt_number,
        payment_method,
        is_free
    )
    VALUES (
        NULLIF(trim(p_payload->>'contract_number'), ''),
        v_customer.id,
        v_container.id,
        p_payload->>'contract_type',
        p_payload->>'period_type',
        NULLIF(p_payload->>'duration_days', '')::integer,
        (p_payload->>'start_date')::timestamptz,
        (p_payload->>'end_date')::timestamptz,
        NULLIF(p_payload->>'expected_pickup_time', '')::timestamptz,
        NULLIF(p_payload->>'location_latitude', '')::double precision,
        NULLIF(p_payload->>'location_longitude', '')::double precision,
        NULLIF(p_payload->>'google_maps_url', ''),
        NULLIF(p_payload->>'location_address', ''),
        COALESCE(NULLIF(p_payload->>'total_cost', '')::numeric, 0),
        COALESCE(NULLIF(p_payload->>'paid_amount', '')::numeric, 0),
        p_payload->>'payment_status',
        'active',
        auth.uid(),
        NULLIF(p_payload->>'assigned_employee_id', '')::uuid,
        NULLIF(p_payload->>'notes', ''),
        NULLIF(p_payload->>'receipt_number', ''),
        NULLIF(p_payload->>'payment_method', ''),
        COALESCE((p_payload->>'is_free')::boolean, false)
    )
    RETURNING * INTO v_contract;

    IF v_contract.receipt_number IS NOT NULL THEN
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
            v_contract.receipt_number,
            v_contract.id,
            v_customer.id,
            COALESCE(NULLIF(p_payload->>'receipt_amount', '')::numeric, 0),
            p_payload->>'payment_method',
            auth.uid(),
            NULLIF(p_payload->>'receipt_notes', '')
        )
        RETURNING * INTO v_receipt;
    END IF;

    UPDATE public.containers
    SET status = 'rented'
    WHERE id = v_container.id
    RETURNING * INTO v_container;

    RETURN jsonb_build_object(
        'customer', to_jsonb(v_customer),
        'contract', to_jsonb(v_contract),
        'container', to_jsonb(v_container),
        'receipt', CASE
            WHEN v_receipt.id IS NULL THEN NULL
            ELSE to_jsonb(v_receipt)
        END
    );
END;
$$;
