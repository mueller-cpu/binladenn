-- =========================================
-- UNDO REFPORT SYSTEM MIGRATION
-- =========================================

-- 1. Add 'reporter_id' to bookings to track WHO reported
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES public.profiles(id);

-- 2. Update 'report_booking_abuse' to store the reporter
CREATE OR REPLACE FUNCTION public.report_booking_abuse(booking_id UUID)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the owner of the booking
  SELECT user_id INTO target_user_id
  FROM public.bookings
  WHERE id = booking_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Buchung nicht gefunden';
  END IF;

  -- Update booking status to mark it as abuse AND store reporter
  UPDATE public.bookings
  SET charging_status = 'not_charging',
      reporter_id = auth.uid() -- Store who reported it
  WHERE id = booking_id;

  -- Ban the user for 7 days from NOW
  UPDATE public.profiles
  SET banned_until = NOW() + INTERVAL '7 days'
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. New Function: Undo Report
-- Only the original reporter or an admin can undo it.
CREATE OR REPLACE FUNCTION public.undo_report_abuse(booking_id UUID)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
  reporter UUID;
BEGIN
  SELECT user_id, reporter_id INTO target_user_id, reporter
  FROM public.bookings
  WHERE id = booking_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Buchung nicht gefunden';
  END IF;

  -- Check if curr user is reporter (or admin, implicitly by policy if we had one, but logic here is stricter)
  IF reporter != auth.uid() AND NOT public.is_admin() THEN
     RAISE EXCEPTION 'Nur der Melder kann dies rückgängig machen.';
  END IF;

  -- Reset booking status
  UPDATE public.bookings
  SET charging_status = 'unknown',
      reporter_id = NULL
  WHERE id = booking_id;

  -- Unban the user (set banned_until to null or past)
  UPDATE public.profiles
  SET banned_until = NULL
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
