-- =========================================
-- PENALTY SYSTEM MIGRATION
-- =========================================

-- 1. Add 'banned_until' to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP WITH TIME ZONE;

-- 2. Add 'charging_status' to bookings
-- We use TEXT with Check constraint for simplicity, avoiding custom ENUM types in migration if possible to reduce conflict
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS charging_status TEXT CHECK (charging_status IN ('charging', 'not_charging', 'unknown')) DEFAULT 'unknown';

-- 3. Secure Function to Report Abuse
-- This function allows any authenticated user to report a booking.
-- It bans the booking owner for 7 days.
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

  -- Update booking status to mark it as abuse
  UPDATE public.bookings
  SET charging_status = 'not_charging'
  WHERE id = booking_id;

  -- Ban the user for 7 days from NOW
  UPDATE public.profiles
  SET banned_until = NOW() + INTERVAL '7 days'
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to Confirm Charging (Good Citizen)
CREATE OR REPLACE FUNCTION public.confirm_charging(booking_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.bookings
  SET charging_status = 'charging'
  WHERE id = booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
