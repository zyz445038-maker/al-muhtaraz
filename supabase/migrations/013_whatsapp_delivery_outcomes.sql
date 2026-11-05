ALTER TABLE public.notification_logs
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS delivery_outcome TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notification_logs_delivery_outcome_check'
          AND conrelid = 'public.notification_logs'::regclass
    ) THEN
        ALTER TABLE public.notification_logs
            ADD CONSTRAINT notification_logs_delivery_outcome_check
            CHECK (delivery_outcome IS NULL OR delivery_outcome IN ('sent', 'failed', 'retryable', 'unknown'));
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_idempotency_key
    ON public.notification_logs(idempotency_key);
