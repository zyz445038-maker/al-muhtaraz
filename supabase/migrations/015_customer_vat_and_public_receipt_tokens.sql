ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS vat_number TEXT;

ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS customer_vat_number TEXT,
    ADD COLUMN IF NOT EXISTS public_verification_token TEXT;

ALTER TABLE public.receipts
    ADD COLUMN IF NOT EXISTS customer_vat_number TEXT,
    ADD COLUMN IF NOT EXISTS public_verification_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_public_verification_token
    ON public.contracts (public_verification_token)
    WHERE public_verification_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_public_verification_token
    ON public.receipts (public_verification_token)
    WHERE public_verification_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_customer_vat_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.vat_number := NULLIF(BTRIM(NEW.vat_number), '');
    IF NEW.vat_number IS NOT NULL AND NEW.vat_number !~ '^3[0-9]{13}3$' THEN
        RAISE EXCEPTION 'الرقم الضريبي السعودي يجب أن يتكون من 15 رقمًا ويبدأ وينتهي بالرقم 3.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_customers_validate_vat_number ON public.customers;
CREATE TRIGGER tr_customers_validate_vat_number
    BEFORE INSERT OR UPDATE OF vat_number ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_customer_vat_number();

CREATE OR REPLACE FUNCTION public.snapshot_contract_verification_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.customer_vat_number IS NULL THEN
        SELECT vat_number INTO NEW.customer_vat_number
        FROM public.customers
        WHERE id = NEW.customer_id;
    END IF;
    IF NEW.public_verification_token IS NULL THEN
        NEW.public_verification_token := REPLACE(gen_random_uuid()::TEXT, '-', '');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_contracts_snapshot_verification_data ON public.contracts;
CREATE TRIGGER tr_contracts_snapshot_verification_data
    BEFORE INSERT ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.snapshot_contract_verification_data();

CREATE OR REPLACE FUNCTION public.snapshot_receipt_verification_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    SELECT vat_number INTO NEW.customer_vat_number
    FROM public.customers
    WHERE id = NEW.customer_id;

    IF NEW.public_verification_token IS NULL THEN
        NEW.public_verification_token := REPLACE(gen_random_uuid()::TEXT, '-', '');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_receipts_snapshot_verification_data ON public.receipts;
CREATE TRIGGER tr_receipts_snapshot_verification_data
    BEFORE INSERT ON public.receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.snapshot_receipt_verification_data();
