UPDATE public.profiles
SET phone = NULL
WHERE role = 'admin'
  AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') IN (
      '966500000001',
      '0500000001',
      '500000001'
  );

UPDATE public.whatsapp_settings
SET admin_phone = ''
WHERE regexp_replace(COALESCE(admin_phone, ''), '[^0-9]', '', 'g') IN (
    '966500000001',
    '0500000001',
    '500000001'
);
