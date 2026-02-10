-- Update booking duration check constraint to support new slots (4, 6, 14 hours)

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_duration_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_duration_check 
CHECK (duration IN (4, 6, 8, 14));
-- Kept 8 for backward compatibility if needed, but added 6 and 14.
