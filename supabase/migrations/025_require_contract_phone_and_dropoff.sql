CREATE OR REPLACE FUNCTION public.enforce_contract_phone_and_dropoff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_customer_phone TEXT;
    v_phone_digits TEXT;
BEGIN
    SELECT phone
    INTO v_customer_phone
    FROM public.customers
    WHERE id = NEW.customer_id;

    v_phone_digits := REGEXP_REPLACE(COALESCE(v_customer_phone, ''), '\D', '', 'g');
    IF LEFT(v_phone_digits, 3) = '966' THEN
        v_phone_digits := SUBSTRING(v_phone_digits FROM 4);
    END IF;
    IF LEFT(v_phone_digits, 1) = '5' THEN
        v_phone_digits := '0' || v_phone_digits;
    END IF;

    IF LENGTH(v_phone_digits) <> 10 OR LEFT(v_phone_digits, 2) <> '05' THEN
        RAISE EXCEPTION 'يجب إدخال رقم جوال سعودي صحيح مكوّن من 10 أرقام ويبدأ بـ 05.';
    END IF;

    IF NULLIF(TRIM(NEW.location_address), '') IS NULL
       AND NULLIF(TRIM(NEW.google_maps_url), '') IS NULL
       AND NOT COALESCE(
           NEW.location_latitude BETWEEN -90 AND 90
           AND NEW.location_longitude BETWEEN -180 AND 180,
           FALSE
       ) THEN
        RAISE EXCEPTION 'موقع أو عنوان التنزيل إلزامي. أدخل العنوان أو حدد الموقع عبر GPS أو رابط الخرائط.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_enforce_contract_phone_and_dropoff
    BEFORE INSERT ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_contract_phone_and_dropoff();
