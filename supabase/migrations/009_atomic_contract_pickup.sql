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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول قبل تسجيل سحب الحاوية.';
    END IF;

    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id
    FOR UPDATE;

    IF NOT FOUND OR v_contract.container_id IS DISTINCT FROM p_container_id THEN
        RAISE EXCEPTION 'العقد أو الحاوية غير موجودين أو لا تملك صلاحية الوصول إليهما.';
    END IF;

    IF v_contract.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'تم إنهاء هذا العقد أو إلغاؤه مسبقاً.';
    END IF;

    SELECT *
    INTO v_container
    FROM public.containers
    WHERE id = p_container_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحاوية غير موجودة.';
    END IF;

    UPDATE public.contracts
    SET status = 'completed'
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;

    UPDATE public.containers
    SET status = 'available'
    WHERE id = p_container_id
    RETURNING * INTO v_container;

    RETURN jsonb_build_object(
        'contract', to_jsonb(v_contract),
        'container', to_jsonb(v_container)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_container_rental_contract(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_container_rental_contract(UUID, UUID) TO authenticated;
