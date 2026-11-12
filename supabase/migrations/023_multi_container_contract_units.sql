CREATE TABLE public.contract_container_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    container_id UUID REFERENCES public.containers(id) ON DELETE SET NULL,
    container_number_snapshot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'cancelled')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    allocated_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT contract_container_units_contract_container_unique UNIQUE (contract_id, container_id)
);

CREATE INDEX idx_contract_container_units_contract
    ON public.contract_container_units (contract_id, status);

CREATE INDEX idx_contract_container_units_container_status
    ON public.contract_container_units (container_id, status);

CREATE INDEX idx_contract_container_units_active_end_date
    ON public.contract_container_units (end_date)
    WHERE status = 'active';

CREATE UNIQUE INDEX idx_contract_container_units_active_container
    ON public.contract_container_units (container_id)
    WHERE status = 'active' AND container_id IS NOT NULL;

CREATE TRIGGER tr_contract_container_units_updated_at
    BEFORE UPDATE ON public.contract_container_units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contract_container_units ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_container_units TO authenticated;

CREATE POLICY "Staff can view contract container units"
    ON public.contract_container_units FOR SELECT
    USING (
        public.is_admin()
        OR (
            public.is_active_staff()
            AND EXISTS (
                SELECT 1
                FROM public.contracts
                WHERE contracts.id = contract_container_units.contract_id
                  AND (
                      EXISTS (
                          SELECT 1 FROM public.profiles
                          WHERE profiles.id = auth.uid()
                            AND profiles.can_view_all_records = true
                      )
                      OR contracts.created_by_employee_id = auth.uid()
                      OR contracts.assigned_employee_id = auth.uid()
                  )
            )
        )
    );

CREATE POLICY "Staff can create contract container units"
    ON public.contract_container_units FOR INSERT
    WITH CHECK (
        public.is_active_staff()
        AND EXISTS (
            SELECT 1
            FROM public.contracts
            WHERE contracts.id = contract_container_units.contract_id
              AND (
                  public.is_admin()
                  OR contracts.created_by_employee_id = auth.uid()
              )
        )
    );

CREATE POLICY "Staff can update contract container units"
    ON public.contract_container_units FOR UPDATE
    USING (public.is_active_staff())
    WITH CHECK (public.is_active_staff());

CREATE POLICY "Admins can delete contract container units"
    ON public.contract_container_units FOR DELETE
    USING (public.is_admin());

DO $migration$
BEGIN
    IF EXISTS (
        SELECT container_id
        FROM public.contracts
        WHERE container_id IS NOT NULL
          AND status IN ('active', 'extended')
        GROUP BY container_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Cannot backfill contract_container_units: a container is assigned to multiple active contracts.';
    END IF;
END;
$migration$;

INSERT INTO public.contract_container_units (
    contract_id,
    container_id,
    container_number_snapshot,
    status,
    start_date,
    end_date,
    returned_at,
    allocated_amount
)
SELECT
    contracts.id,
    contracts.container_id,
    containers.container_number,
    CASE
        WHEN contracts.status = 'completed' THEN 'returned'
        WHEN contracts.status = 'cancelled' THEN 'cancelled'
        ELSE 'active'
    END,
    contracts.start_date,
    contracts.end_date,
    CASE
        WHEN contracts.status IN ('completed', 'cancelled') THEN contracts.updated_at
        ELSE NULL
    END,
    GREATEST(COALESCE(contracts.total_cost, 0), 0)
FROM public.contracts
JOIN public.containers ON containers.id = contracts.container_id
WHERE contracts.container_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_contract_container_unit_for_legacy_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_container_number TEXT;
BEGIN
    IF NEW.container_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT container_number
    INTO v_container_number
    FROM public.containers
    WHERE id = NEW.container_id;

    IF v_container_number IS NULL THEN
        RAISE EXCEPTION 'The contract container does not exist.';
    END IF;

    INSERT INTO public.contract_container_units (
        contract_id,
        container_id,
        container_number_snapshot,
        status,
        start_date,
        end_date,
        returned_at,
        allocated_amount
    )
    VALUES (
        NEW.id,
        NEW.container_id,
        v_container_number,
        CASE
            WHEN NEW.status = 'completed' THEN 'returned'
            WHEN NEW.status = 'cancelled' THEN 'cancelled'
            ELSE 'active'
        END,
        NEW.start_date,
        NEW.end_date,
        CASE WHEN NEW.status IN ('completed', 'cancelled') THEN NOW() ELSE NULL END,
        GREATEST(COALESCE(NEW.total_cost, 0), 0)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_contract_container_units_legacy_insert ON public.contracts;
CREATE TRIGGER tr_contract_container_units_legacy_insert
    AFTER INSERT ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.create_contract_container_unit_for_legacy_contract();

CREATE OR REPLACE FUNCTION public.schedule_contract_container_unit_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_name TEXT;
    v_customer_phone TEXT;
    v_employee_name TEXT;
    v_employee_phone TEXT;
    v_container_numbers TEXT;
    v_contract public.contracts%ROWTYPE;
    v_reminder RECORD;
    v_reminder_time TIMESTAMPTZ;
    v_key_prefix TEXT;
BEGIN
    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = NEW.contract_id;

    IF NOT FOUND OR v_contract.contract_type <> 'debris' THEN
        RETURN NEW;
    END IF;

    v_key_prefix := 'debris-units:' || NEW.contract_id::TEXT || ':';

    UPDATE public.notification_logs
    SET status = 'cancelled'
    WHERE contract_id = NEW.contract_id
      AND notification_type = 'debris_pickup_4h'
      AND status = 'pending'
      AND (idempotency_key IS NULL OR idempotency_key LIKE v_key_prefix || '%');

    SELECT name, phone
    INTO v_customer_name, v_customer_phone
    FROM public.customers
    WHERE id = v_contract.customer_id;

    IF v_contract.assigned_employee_id IS NOT NULL THEN
        SELECT full_name, phone
        INTO v_employee_name, v_employee_phone
        FROM public.profiles
        WHERE id = v_contract.assigned_employee_id;
    END IF;

    SELECT string_agg(container_number_snapshot, '، ' ORDER BY container_number_snapshot)
    INTO v_container_numbers
    FROM public.contract_container_units
    WHERE contract_id = NEW.contract_id
      AND status = 'active';

    UPDATE public.notification_logs
    SET message_body = 'مرحباً ' || COALESCE(v_customer_name, 'عزيزنا العميل')
        || '، تم توثيق عقدك رقم (' || v_contract.contract_number
        || ') بنجاح لدى المحترز للحاويات. أرقام الحاويات: '
        || COALESCE(v_container_numbers, '-') || '. شكراً لثقتكم بنا.'
    WHERE contract_id = NEW.contract_id
      AND notification_type = 'contract_created'
      AND status = 'pending';

    FOR v_reminder IN
        SELECT
            end_date,
            string_agg(container_number_snapshot, '، ' ORDER BY container_number_snapshot) AS container_numbers
        FROM public.contract_container_units
        WHERE contract_id = NEW.contract_id
          AND status = 'active'
        GROUP BY end_date
    LOOP
        v_reminder_time := v_reminder.end_date - INTERVAL '4 hours';
        IF v_reminder_time <= NOW() THEN
            CONTINUE;
        END IF;

        IF v_customer_phone IS NOT NULL THEN
            INSERT INTO public.notification_logs AS existing_log (
                contract_id, customer_id, recipient_role, recipient_phone, recipient_name,
                notification_type, message_body, idempotency_key, scheduled_for, status
            ) VALUES (
                NEW.contract_id, v_contract.customer_id, 'customer', v_customer_phone, v_customer_name,
                'debris_pickup_4h',
                'عزيزنا ' || COALESCE(v_customer_name, 'العميل')
                    || '، نذكّركم بقرب موعد سحب حاوية الأنقاض ('
                    || v_reminder.container_numbers
                    || ') خلال 4 ساعات. في حال رغبتكم بالتمديد يرجى التواصل معنا.',
                v_key_prefix || 'customer:' || EXTRACT(EPOCH FROM v_reminder.end_date)::BIGINT::TEXT,
                v_reminder_time, 'pending'
            )
            ON CONFLICT (idempotency_key) DO UPDATE
            SET recipient_phone = EXCLUDED.recipient_phone,
                recipient_name = EXCLUDED.recipient_name,
                message_body = EXCLUDED.message_body,
                scheduled_for = EXCLUDED.scheduled_for,
                status = 'pending',
                sent_at = NULL,
                delivery_outcome = NULL,
                error_message = NULL
            WHERE existing_log.status IN ('pending', 'cancelled');
        END IF;

        IF v_employee_phone IS NOT NULL THEN
            INSERT INTO public.notification_logs AS existing_log (
                contract_id, customer_id, recipient_role, recipient_phone, recipient_name,
                notification_type, message_body, idempotency_key, scheduled_for, status
            ) VALUES (
                NEW.contract_id, v_contract.customer_id, 'employee', v_employee_phone, v_employee_name,
                'debris_pickup_4h',
                'تنبيه تشغيلي: يرجى تجهيز السائق لسحب حاويات الأنقاض ('
                    || v_reminder.container_numbers || ') للعميل '
                    || COALESCE(v_customer_name, '-') || ' خلال 4 ساعات.',
                v_key_prefix || 'employee:' || EXTRACT(EPOCH FROM v_reminder.end_date)::BIGINT::TEXT,
                v_reminder_time, 'pending'
            )
            ON CONFLICT (idempotency_key) DO UPDATE
            SET recipient_phone = EXCLUDED.recipient_phone,
                recipient_name = EXCLUDED.recipient_name,
                message_body = EXCLUDED.message_body,
                scheduled_for = EXCLUDED.scheduled_for,
                status = 'pending',
                sent_at = NULL,
                delivery_outcome = NULL,
                error_message = NULL
            WHERE existing_log.status IN ('pending', 'cancelled');
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_schedule_contract_container_unit_reminders ON public.contract_container_units;
CREATE TRIGGER tr_schedule_contract_container_unit_reminders
    AFTER INSERT OR UPDATE OF end_date, status ON public.contract_container_units
    FOR EACH ROW
    EXECUTE FUNCTION public.schedule_contract_container_unit_reminders();

CREATE OR REPLACE FUNCTION public.sync_container_status_on_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status IN ('completed', 'cancelled') THEN
        WITH transitioned_units AS (
            UPDATE public.contract_container_units
            SET status = CASE WHEN NEW.status = 'completed' THEN 'returned' ELSE 'cancelled' END,
                returned_at = COALESCE(returned_at, NOW())
            WHERE contract_id = NEW.id
              AND status = 'active'
            RETURNING container_id
        )
        UPDATE public.containers
        SET status = 'available'
        WHERE id IN (
            SELECT container_id
            FROM transitioned_units
            WHERE container_id IS NOT NULL
        );
    ELSE
        UPDATE public.containers
        SET status = 'rented'
        WHERE id IN (
            SELECT container_id
            FROM public.contract_container_units
            WHERE contract_id = NEW.id
              AND status = 'active'
              AND container_id IS NOT NULL
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_container_status ON public.contracts;
CREATE TRIGGER tr_sync_container_status
    AFTER INSERT OR UPDATE OF status ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_container_status_on_contract();

CREATE OR REPLACE FUNCTION public.guard_contract_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status = 'completed'
       AND (
           NEW.paid_amount < NEW.total_cost
           OR EXISTS (
               SELECT 1
               FROM public.contract_container_units
               WHERE contract_id = NEW.id
                 AND status = 'active'
           )
       ) THEN
        RAISE EXCEPTION 'لا يمكن إكمال العقد قبل إعادة جميع الحاويات وتسوية الرصيد المالي.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_guard_contract_completion ON public.contracts;
CREATE TRIGGER tr_guard_contract_completion
    BEFORE UPDATE OF status, paid_amount, total_cost ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_contract_completion();

CREATE OR REPLACE FUNCTION public.complete_settled_returned_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status NOT IN ('completed', 'cancelled')
       AND NEW.paid_amount >= NEW.total_cost
       AND EXISTS (
           SELECT 1
           FROM public.contract_container_units
           WHERE contract_id = NEW.id
       )
       AND NOT EXISTS (
           SELECT 1
           FROM public.contract_container_units
           WHERE contract_id = NEW.id
             AND status = 'active'
       ) THEN
        UPDATE public.contracts
        SET status = 'completed'
        WHERE id = NEW.id
          AND status NOT IN ('completed', 'cancelled');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_complete_settled_returned_contract ON public.contracts;
CREATE TRIGGER tr_complete_settled_returned_contract
    AFTER UPDATE OF paid_amount, total_cost ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.complete_settled_returned_contract();

CREATE OR REPLACE FUNCTION public.create_container_rental_contract_with_units(
    p_payload JSONB,
    p_container_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_container_id UUID;
    v_container_number TEXT;
    v_contract_id UUID;
    v_contract_status TEXT;
    v_total NUMERIC(10, 2);
    v_allocated NUMERIC(10, 2) := 0;
    v_unit_amount NUMERIC(10, 2);
    v_result JSONB;
    v_units JSONB;
    v_containers JSONB;
    v_count INTEGER := 0;
    v_index INTEGER := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل إنشاء العقد.';
    END IF;
    IF p_container_ids IS NULL
       OR cardinality(p_container_ids) < 1
       OR cardinality(p_container_ids) > 50
       OR array_position(p_container_ids, NULL) IS NOT NULL THEN
        RAISE EXCEPTION 'يجب اختيار ما بين حاوية واحدة و50 حاوية صالحة.';
    END IF;
    IF (SELECT COUNT(DISTINCT id) FROM unnest(p_container_ids) AS selected(id))
       <> cardinality(p_container_ids) THEN
        RAISE EXCEPTION 'لا يمكن اختيار الحاوية نفسها أكثر من مرة.';
    END IF;
    IF cardinality(p_container_ids) > 1
       AND p_payload->>'contract_type' <> 'debris' THEN
        RAISE EXCEPTION 'لا يسمح بضم عدة حاويات إلا في عقد حاويات المخلفات.';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.containers
        WHERE id = ANY(p_container_ids)
          AND type::TEXT IS DISTINCT FROM p_payload->>'contract_type'
    ) THEN
        RAISE EXCEPTION 'نوع إحدى الحاويات لا يطابق نوع العقد.';
    END IF;

    FOR v_container_id IN
        SELECT id
        FROM public.containers
        WHERE id = ANY(p_container_ids)
        ORDER BY id
        FOR UPDATE
    LOOP
        SELECT container_number, status
        INTO v_container_number, v_contract_status
        FROM public.containers
        WHERE id = v_container_id;
        IF v_contract_status <> 'available' THEN
            RAISE EXCEPTION 'الحاوية (%) لم تعد متاحة للتأجير.', v_container_number;
        END IF;
        v_count := v_count + 1;
    END LOOP;

    IF v_count <> cardinality(p_container_ids) THEN
        RAISE EXCEPTION 'حاوية واحدة أو أكثر غير موجودة أو غير متاحة.';
    END IF;

    v_result := public.create_container_rental_contract(
        (p_payload - 'container_ids') || jsonb_build_object('container_id', p_container_ids[1])
    );
    v_contract_id := (v_result->'contract'->>'id')::UUID;
    v_total := COALESCE((v_result->'contract'->>'total_cost')::NUMERIC, 0);

    FOREACH v_container_id IN ARRAY p_container_ids
    LOOP
        v_index := v_index + 1;
        SELECT container_number
        INTO v_container_number
        FROM public.containers
        WHERE id = v_container_id;

        IF v_index = cardinality(p_container_ids) THEN
            v_unit_amount := v_total - v_allocated;
        ELSE
            v_unit_amount := ROUND(v_total / cardinality(p_container_ids), 2);
            v_allocated := v_allocated + v_unit_amount;
        END IF;

        IF v_index = 1 THEN
            UPDATE public.contract_container_units
            SET allocated_amount = v_unit_amount
            WHERE contract_id = v_contract_id
              AND container_id = v_container_id;
        ELSE
            INSERT INTO public.contract_container_units (
                contract_id,
                container_id,
                container_number_snapshot,
                status,
                start_date,
                end_date,
                allocated_amount
            )
            VALUES (
                v_contract_id,
                v_container_id,
                v_container_number,
                'active',
                (v_result->'contract'->>'start_date')::TIMESTAMPTZ,
                (v_result->'contract'->>'end_date')::TIMESTAMPTZ,
                v_unit_amount
            );
        END IF;
    END LOOP;

    UPDATE public.containers
    SET status = 'rented'
    WHERE id = ANY(p_container_ids);

    SELECT COALESCE(
        jsonb_agg(
            (
                to_jsonb(units)
                || jsonb_build_object('container', to_jsonb(containers))
            )
            ORDER BY units.created_at, units.id
        ),
        '[]'::JSONB
    )
    INTO v_units
    FROM public.contract_container_units AS units
    LEFT JOIN public.containers AS containers ON containers.id = units.container_id
    WHERE units.contract_id = v_contract_id;

    SELECT COALESCE(jsonb_agg(to_jsonb(containers) ORDER BY containers.container_number), '[]'::JSONB)
    INTO v_containers
    FROM public.containers
    WHERE id = ANY(p_container_ids);

    RETURN v_result || jsonb_build_object(
        'contract_container_units', v_units,
        'containers', v_containers
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_container_rental_contract_with_units(JSONB, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_container_rental_contract_with_units(JSONB, UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_container_rental_unit(
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
    v_unit public.contract_container_units%ROWTYPE;
    v_container public.containers%ROWTYPE;
    v_active_units INTEGER;
BEGIN
    IF auth.uid() IS NULL OR NOT public.has_inventory_access() THEN
        RAISE EXCEPTION 'لا تملك صلاحية تسجيل عودة الحاوية.';
    END IF;

    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id
    FOR UPDATE;
    IF NOT FOUND OR v_contract.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'العقد غير موجود أو منتهٍ.';
    END IF;

    SELECT *
    INTO v_unit
    FROM public.contract_container_units
    WHERE contract_id = p_contract_id
      AND container_id = p_container_id
      AND status = 'active'
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحاوية ليست وحدة نشطة في هذا العقد أو سبق تسجيل عودتها.';
    END IF;

    UPDATE public.contract_container_units
    SET status = 'returned',
        returned_at = NOW()
    WHERE id = v_unit.id
    RETURNING * INTO v_unit;

    UPDATE public.containers
    SET status = 'available'
    WHERE id = p_container_id
    RETURNING * INTO v_container;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'تعذر تحديث حالة الحاوية في المخزون.';
    END IF;

    SELECT COUNT(*)
    INTO v_active_units
    FROM public.contract_container_units
    WHERE contract_id = p_contract_id
      AND status = 'active';

    IF v_active_units > 0 THEN
        UPDATE public.contracts
        SET end_date = (
                SELECT MAX(end_date)
                FROM public.contract_container_units
                WHERE contract_id = p_contract_id
                  AND status = 'active'
            ),
            expected_pickup_time = (
                SELECT MAX(end_date)
                FROM public.contract_container_units
                WHERE contract_id = p_contract_id
                  AND status = 'active'
            )
        WHERE id = p_contract_id
        RETURNING * INTO v_contract;
    END IF;

    IF v_active_units = 0 AND v_contract.paid_amount >= v_contract.total_cost THEN
        UPDATE public.contracts
        SET status = 'completed'
        WHERE id = p_contract_id
          AND status NOT IN ('completed', 'cancelled')
        RETURNING * INTO v_contract;
    END IF;

    RETURN jsonb_build_object(
        'contract', to_jsonb(v_contract),
        'unit', to_jsonb(v_unit),
        'container', to_jsonb(v_container),
        'active_unit_count', v_active_units
    );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_container_rental_unit(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_container_rental_unit(UUID, UUID) TO authenticated;

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
    v_active_units INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_active_units
    FROM public.contract_container_units
    WHERE contract_id = p_contract_id
      AND status = 'active';

    IF v_active_units <> 1
       OR NOT EXISTS (
           SELECT 1
           FROM public.contract_container_units
           WHERE contract_id = p_contract_id
             AND container_id = p_container_id
             AND status = 'active'
       ) THEN
        RAISE EXCEPTION 'يجب تسجيل عودة الحاوية المحددة؛ لا يمكن إنهاء عقد متعدد الوحدات دفعة واحدة.';
    END IF;

    RETURN public.complete_container_rental_unit(p_contract_id, p_container_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_container_rental_contract(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_container_rental_contract(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.extend_container_rental_contract_for_units(
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
    p_receipt_notes TEXT,
    p_container_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_unit_count INTEGER;
    v_updated_contract public.contracts%ROWTYPE;
    v_result JSONB;
    v_units JSONB;
BEGIN
    IF p_container_ids IS NULL
       OR cardinality(p_container_ids) = 0
       OR array_position(p_container_ids, NULL) IS NOT NULL
       OR (SELECT COUNT(DISTINCT id) FROM unnest(p_container_ids) AS selected(id))
          <> cardinality(p_container_ids) THEN
        RAISE EXCEPTION 'يجب اختيار وحدات نشطة وصالحة للتمديد.';
    END IF;

    PERFORM 1
    FROM public.contracts
    WHERE id = p_contract_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'العقد غير موجود.';
    END IF;

    PERFORM 1
    FROM public.contract_container_units
    WHERE contract_id = p_contract_id
      AND container_id = ANY(p_container_ids)
      AND status = 'active'
    FOR UPDATE;

    SELECT COUNT(*)
    INTO v_unit_count
    FROM public.contract_container_units
    WHERE contract_id = p_contract_id
      AND container_id = ANY(p_container_ids)
      AND status = 'active';

    IF v_unit_count <> cardinality(p_container_ids) THEN
        RAISE EXCEPTION 'إحدى الحاويات المحددة ليست وحدة نشطة في هذا العقد.';
    END IF;

    v_result := public.extend_container_rental_contract_vat(
        p_contract_id,
        p_additional_days,
        p_additional_subtotal,
        p_additional_vat,
        p_new_end_date,
        p_paid_subtotal,
        p_paid_vat,
        p_payment_choice,
        p_extension_notes,
        p_receipt_number,
        p_receipt_amount,
        p_receipt_non_taxable_amount,
        p_receipt_subtotal_amount,
        p_receipt_vat_amount,
        p_receipt_notes
    );

    WITH selected_units AS (
        SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY id) AS unit_number,
            COUNT(*) OVER () AS unit_count
        FROM public.contract_container_units
        WHERE contract_id = p_contract_id
          AND container_id = ANY(p_container_ids)
          AND status = 'active'
    ),
    allocations AS (
        SELECT
            id,
            CASE
                WHEN unit_number = unit_count
                    THEN p_additional_subtotal + p_additional_vat
                        - ROUND((p_additional_subtotal + p_additional_vat) / unit_count, 2) * (unit_count - 1)
                ELSE ROUND((p_additional_subtotal + p_additional_vat) / unit_count, 2)
            END AS amount
        FROM selected_units
    )
    UPDATE public.contract_container_units AS units
    SET end_date = units.end_date + make_interval(days => p_additional_days),
        allocated_amount = units.allocated_amount + allocations.amount
    FROM allocations
    WHERE units.id = allocations.id;

    UPDATE public.contracts
    SET end_date = (
            SELECT MAX(end_date)
            FROM public.contract_container_units
            WHERE contract_id = p_contract_id
              AND status = 'active'
        ),
        expected_pickup_time = (
            SELECT MAX(end_date)
            FROM public.contract_container_units
            WHERE contract_id = p_contract_id
              AND status = 'active'
        )
    WHERE id = p_contract_id
    RETURNING * INTO v_updated_contract;

    SELECT COALESCE(
        jsonb_agg(
            to_jsonb(units)
            || jsonb_build_object('container', to_jsonb(containers))
            ORDER BY units.created_at, units.id
        ),
        '[]'::JSONB
    )
    INTO v_units
    FROM public.contract_container_units AS units
    LEFT JOIN public.containers AS containers ON containers.id = units.container_id
    WHERE units.contract_id = p_contract_id;

    RETURN v_result
        || jsonb_build_object('contract', to_jsonb(v_updated_contract))
        || jsonb_build_object('contract_container_units', v_units);
END;
$$;

REVOKE ALL ON FUNCTION public.extend_container_rental_contract_for_units(
    UUID, INTEGER, NUMERIC, NUMERIC, TIMESTAMPTZ, NUMERIC, NUMERIC, TEXT,
    TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, UUID[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_container_rental_contract_for_units(
    UUID, INTEGER, NUMERIC, NUMERIC, TIMESTAMPTZ, NUMERIC, NUMERIC, TEXT,
    TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, UUID[]
) TO authenticated;
