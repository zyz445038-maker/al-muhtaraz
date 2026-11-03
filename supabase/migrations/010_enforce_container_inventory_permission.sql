CREATE OR REPLACE FUNCTION public.has_inventory_access()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND (
              role = 'admin'
              OR permissions ->> 'can_manage_inventory' = 'true'
          )
    );
$$;

DROP POLICY IF EXISTS "Staff can insert containers" ON public.containers;
CREATE POLICY "Staff can insert containers"
    ON public.containers FOR INSERT
    WITH CHECK (public.has_inventory_access());
