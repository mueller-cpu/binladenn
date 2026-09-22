-- ============================================================
-- 06: Ein-Tap-Buchen, Verlängerung, abgesichertes Melden, Realtime
-- Datum: 2026-09-22 · idempotent, mehrfach ausführbar
--
-- Ausführen: Supabase Dashboard → SQL Editor → New query → RUN
-- ============================================================

-- 1. Flexible Dauer --------------------------------------------
-- Verlängerte Buchungen haben 6 oder 7 Stunden, verkürzte Folgeslots 3 oder 4.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_duration_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_duration_check CHECK (duration > 0 AND duration <= 24);

-- 2. Sperre serverseitig durchsetzen ---------------------------
-- Greift bei Buchen, Wiederherstellen (Undo) und Verlängern.
-- Nicht bei Stornieren oder beim Bestätigen des Ladens.
CREATE OR REPLACE FUNCTION public.enforce_booking_ban()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  until_ts TIMESTAMPTZ;
BEGIN
  SELECT banned_until INTO until_ts FROM public.profiles WHERE id = NEW.user_id;
  IF until_ts IS NOT NULL AND until_ts > NOW() THEN
    RAISE EXCEPTION 'Du bist bis % gesperrt.',
      to_char(until_ts AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_enforce_ban ON public.bookings;
CREATE TRIGGER bookings_enforce_ban
  BEFORE INSERT OR UPDATE OF status, start_time, end_time ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.enforce_booking_ban();

-- 3. Melden härten ---------------------------------------------
-- Nur fremde, aktive, gerade laufende, noch nicht gemeldete Buchungen.
CREATE OR REPLACE FUNCTION public.report_booking_abuse(booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = booking_id;

  IF b.id IS NULL THEN
    RAISE EXCEPTION 'Buchung nicht gefunden.';
  END IF;
  IF b.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Du kannst deine eigene Buchung nicht melden.';
  END IF;
  IF b.status <> 'active' THEN
    RAISE EXCEPTION 'Diese Buchung ist nicht aktiv.';
  END IF;
  IF NOW() < b.start_time OR NOW() >= b.end_time THEN
    RAISE EXCEPTION 'Melden ist nur während des laufenden Slots möglich.';
  END IF;
  IF b.charging_status = 'not_charging' THEN
    RAISE EXCEPTION 'Diese Buchung wurde bereits gemeldet.';
  END IF;

  UPDATE public.bookings
  SET charging_status = 'not_charging',
      reporter_id = auth.uid()
  WHERE id = booking_id;

  UPDATE public.profiles
  SET banned_until = NOW() + INTERVAL '7 days'
  WHERE id = b.user_id;
END;
$$;

-- 4. Punkte: gemeldete Ladungen zählen nicht mehr --------------
CREATE OR REPLACE FUNCTION public.booking_count(profiles_row public.profiles)
RETURNS integer
LANGUAGE sql STABLE
AS $$
  SELECT count(*)::integer
  FROM public.bookings
  WHERE user_id = profiles_row.id
    AND status = 'active'
    AND end_time < NOW()
    AND COALESCE(charging_status, 'unknown') <> 'not_charging';
$$;

-- 5. Lesen: alle Buchungen sichtbar ----------------------------
-- Nötig, damit Realtime auch Stornierungen anderer zustellt.
-- Die App filtert überall auf status = 'active'.
DROP POLICY IF EXISTS "bookings_read" ON public.bookings;
CREATE POLICY "bookings_read" ON public.bookings
  FOR SELECT TO authenticated USING (true);

-- 6. Realtime für bookings -------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;
