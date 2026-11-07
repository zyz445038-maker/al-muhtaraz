DO $migration$
DECLARE
    v_function_oid REGPROCEDURE := 'public.extend_container_rental_contract_vat(
        uuid, integer, numeric, numeric, timestamp with time zone, numeric,
        numeric, text, text, text, numeric, numeric, numeric, numeric, text
    )'::REGPROCEDURE;
    v_function_definition TEXT;
    v_updated_definition TEXT;
    v_guard_pattern CONSTANT TEXT := $pattern$p_payment_choice[[:space:]]*=[[:space:]]*'sadad'[[:space:]]+AND[[:space:]]+ROUND[[:space:]]*\([[:space:]]*COALESCE[[:space:]]*\([[:space:]]*p_receipt_amount[[:space:]]*,[[:space:]]*0[[:space:]]*\)[[:space:]]*,[[:space:]]*2[[:space:]]*\)[[:space:]]*>[[:space:]]*0$pattern$;
    v_guard_count INTEGER;
BEGIN
    v_function_definition := pg_get_functiondef(v_function_oid);

    SELECT count(*)
    INTO v_guard_count
    FROM regexp_matches(v_function_definition, v_guard_pattern, 'g');

    IF v_guard_count <> 1 THEN
        RAISE EXCEPTION 'تعذر التحقق من حارس تحصيل سداد في دالة التمديد.';
    END IF;

    v_updated_definition := regexp_replace(
        v_function_definition,
        v_guard_pattern,
        $replacement$p_payment_choice IN ('sadad', 'postpaid') AND ROUND(COALESCE(p_receipt_amount, 0), 2) > 0$replacement$
    );

    IF v_updated_definition = v_function_definition
       OR POSITION($guard$p_payment_choice IN ('sadad', 'postpaid')$guard$ IN v_updated_definition) = 0 THEN
        RAISE EXCEPTION 'تعذر إضافة حارس الدفع الآجل إلى دالة التمديد.';
    END IF;

    EXECUTE v_updated_definition;
END;
$migration$;
