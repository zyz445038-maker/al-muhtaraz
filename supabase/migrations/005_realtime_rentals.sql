ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS receipt_number TEXT,
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_ref TEXT,
    received_by_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.receipts IS 'سندات القبض المالية المرتبطة بالعقود والعملاء.';

CREATE INDEX IF NOT EXISTS idx_receipts_contract ON public.receipts(contract_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer ON public.receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON public.receipts(receipt_number);

ALTER TABLE public.receipts
    DROP CONSTRAINT IF EXISTS receipts_payment_method_check;

ALTER TABLE public.receipts
    ADD CONSTRAINT receipts_payment_method_check
    CHECK (payment_method IN (
        'apple_pay',
        'mada',
        'credit_card',
        'cash',
        'pos',
        'bank_transfer',
        'free'
    ));

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view receipts" ON public.receipts;
CREATE POLICY "Staff can view receipts"
    ON public.receipts FOR SELECT
    USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can insert receipts" ON public.receipts;
CREATE POLICY "Staff can insert receipts"
    ON public.receipts FOR INSERT
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins only can delete receipts" ON public.receipts;
CREATE POLICY "Admins only can delete receipts"
    ON public.receipts FOR DELETE
    USING (public.is_admin());

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

    SELECT *
    INTO v_container
    FROM public.containers
    WHERE id = v_container.id;

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

REVOKE ALL ON FUNCTION public.create_container_rental_contract(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_container_rental_contract(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_container_rental_contract(
    p_contract_id UUID,
    p_container_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_contract public.contracts%ROWTYPE;
    v_container public.containers%ROWTYPE;
BEGIN
    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id
    FOR UPDATE;

    IF NOT FOUND OR v_contract.container_id IS DISTINCT FROM p_container_id THEN
        RAISE EXCEPTION 'العقد أو الحاوية غير موجودين أو لا تملك صلاحية الوصول إليهما.';
    END IF;

    UPDATE public.contracts
    SET status = 'completed'
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;

    SELECT *
    INTO v_container
    FROM public.containers
    WHERE id = p_container_id;

    RETURN jsonb_build_object(
        'contract', to_jsonb(v_contract),
        'container', to_jsonb(v_container)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_container_rental_contract(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_container_rental_contract(UUID, UUID) TO authenticated;

DO $$
DECLARE
    v_table_name TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOREACH v_table_name IN ARRAY ARRAY[
        'containers',
        'customers',
        'contracts',
        'receipts',
        'notification_logs',
        'notifications'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = v_table_name
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table_name);
        END IF;
    END LOOP;
END;
$$;
