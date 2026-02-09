-- ==========================================
-- FIX INFINITE RECURSION IN RLS
-- ==========================================

-- The error happens because the policy checks the 'profiles' table 
-- while trying to protect the 'profiles' table, causing a loop.
-- Solution: Move the check to a secure function.

-- 1. Create a secure function to check admin status
-- SECURITY DEFINER means it runs with the rights of the creator (superuser/postgres)
-- bypassing RLS checks for this specific query.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update PROFILES Policies
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

CREATE POLICY "profiles_admin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin());

-- 3. Update BOOKINGS Policies (just to be safe and consistent)
DROP POLICY IF EXISTS "bookings_admin" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

CREATE POLICY "bookings_admin"
ON public.bookings
FOR ALL
TO authenticated
USING (public.is_admin());
