ALTER TABLE public.receipts
    DROP CONSTRAINT IF EXISTS receipts_payment_method_check,
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
