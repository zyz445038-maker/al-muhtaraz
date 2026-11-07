DO $migration$
DECLARE
    v_function_oid REGPROCEDURE := 'public.extend_container_rental_contract_vat(
        uuid, integer, numeric, numeric, timestamp with time zone, numeric,
        numeric, text, text, text, numeric, numeric, numeric, numeric, text
    )'::REGPROCEDURE;
    v_function_definition TEXT;
    v_updated_definition TEXT;
    v_old_guard CONSTANT TEXT := $guard$    IF p_payment_choice = 'sadad' AND ROUND(COALESCE(p_receipt_amount, 0), 2) > 0 THEN
        RAISE EXCEPTION 'لا يمكن تسجيل تحصيل سداد قبل تأكيده من مزود الدفع.';
    END IF;$guard$;
    v_new_guard CONSTANT TEXT := $guard$    IF p_payment_choice IN ('sadad', 'postpaid')
       AND ROUND(COALESCE(p_receipt_amount, 0), 2) > 0 THEN
        RAISE EXCEPTION 'لا يمكن تسجيل تحصيل سداد أو الدفع الآجل قبل تأكيد التحصيل.';
    END IF;$guard$;
BEGIN
    v_function_definition := replace(
        replace(pg_get_functiondef(v_function_oid), E'\r\n', E'\n'),
        E'\r',
        E'\n'
    );

    IF (
        length(v_function_definition)
        - length(replace(v_function_definition, v_old_guard, ''))
    ) / length(v_old_guard) <> 1 THEN
        RAISE EXCEPTION 'تعذر التحقق من حارس تحصيل سداد في دالة التمديد.';
    END IF;

    v_updated_definition := replace(v_function_definition, v_old_guard, v_new_guard);
    EXECUTE v_updated_definition;
END;
$migration$;
