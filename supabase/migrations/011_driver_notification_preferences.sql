ALTER TABLE public.whatsapp_settings
    ADD COLUMN IF NOT EXISTS notify_driver_on_contract_created BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notify_driver_on_alerts BOOLEAN NOT NULL DEFAULT FALSE;
