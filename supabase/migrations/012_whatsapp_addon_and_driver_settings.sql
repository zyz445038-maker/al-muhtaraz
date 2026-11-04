ALTER TABLE public.whatsapp_settings
    ADD COLUMN IF NOT EXISTS evolution_server_url TEXT,
    ADD COLUMN IF NOT EXISTS evolution_api_key TEXT,
    ADD COLUMN IF NOT EXISTS notify_driver_on_contract_created BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notify_driver_on_alerts BOOLEAN NOT NULL DEFAULT FALSE;
