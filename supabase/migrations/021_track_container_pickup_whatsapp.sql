ALTER TABLE public.notification_logs
    DROP CONSTRAINT IF EXISTS notification_logs_notification_type_check,
    ADD CONSTRAINT notification_logs_notification_type_check
    CHECK (notification_type IN (
        'debris_pickup_4h',
        'commercial_7d_before',
        'commercial_2d_before',
        'contract_created',
        'container_picked_up',
        'custom_alert'
    ));
