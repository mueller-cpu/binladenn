-- Computed Column for Booking Count
-- This allows taking advantage of PostgREST's computed columns feature.
-- We can select it like a normal column: .select('*, booking_count')

CREATE OR REPLACE FUNCTION booking_count(profiles_row profiles)
RETURNS integer AS $$
  SELECT count(*)::integer
  FROM bookings
  WHERE user_id = profiles_row.id
  AND status = 'active'
  AND end_time < NOW();
$$ LANGUAGE sql STABLE;
