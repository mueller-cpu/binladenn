-- ============================================================
-- BIN LADEN APP — COMPLETE SUPABASE SETUP (Full Rebuild)
-- ------------------------------------------------------------
-- Führt alle Migrationen 00–06 in korrekter Reihenfolge zusammen
-- und stellt den finalen Live-Zustand her.
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.
--
-- Verwendung:
--   Supabase Dashboard -> SQL Editor -> New query
--   -> kompletten Inhalt einfügen -> RUN
-- ============================================================

-- 1. Extensions ----------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table ------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  banned_until TIMESTAMP WITH TIME ZONE,        -- aus 02_add_penalty_system
  avatar_url TEXT,                              -- aus 04_add_avatar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Secure Admin Function (verhindert RLS-Rekursion) --------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Profile Policies ----------------------------------------
DROP POLICY IF EXISTS "profiles_read_all"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"  ON public.profiles;

CREATE POLICY "profiles_read_all"   ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"  ON public.profiles FOR ALL    TO authenticated USING (public.is_admin());

-- 5. Bookings Table ------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  booking_type TEXT NOT NULL DEFAULT 'regular' CHECK (booking_type IN ('regular', 'maintenance')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  cancellation_reason TEXT,
  charging_status TEXT CHECK (charging_status IN ('charging', 'not_charging', 'unknown')) DEFAULT 'unknown',  -- aus 02
  reporter_id UUID REFERENCES public.profiles(id),                                                            -- aus 03
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT no_overlap EXCLUDE USING gist (tstzrange(start_time, end_time) WITH &&) WHERE (status = 'active')
);

-- Finales Duration-Constraint (06: Verlängerungen +1/+2h, verkürzte Folgeslots)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_duration_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_duration_check CHECK (duration > 0 AND duration <= 24);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id    ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON public.bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_read"   ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;
DROP POLICY IF EXISTS "bookings_admin"  ON public.bookings;

-- 06: alle Buchungen lesbar, damit Realtime auch Stornierungen anderer zustellt.
CREATE POLICY "bookings_read"   ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "bookings_insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bookings_delete" ON public.bookings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bookings_admin"  ON public.bookings FOR ALL    TO authenticated USING (public.is_admin());

-- 6. Notification Log ----------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('confirmation', 'reminder', 'cancellation', 'modification')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_status TEXT NOT NULL CHECK (email_status IN ('sent', 'failed', 'pending'))
);

-- 7. Auto-Profile Trigger bei Registrierung ------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'User'),
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Sperre serverseitig durchsetzen (06) --------------------
-- Greift bei Buchen, Wiederherstellen (Undo) und Verlängern.
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

-- 9. Penalty / Report System (02 + 03 + 06) ------------------
-- Melden nur für fremde, aktive, gerade laufende, noch nicht gemeldete Buchungen.
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

CREATE OR REPLACE FUNCTION public.confirm_charging(booking_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.bookings SET charging_status = 'charging' WHERE id = booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.undo_report_abuse(booking_id UUID)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
  reporter UUID;
BEGIN
  SELECT user_id, reporter_id INTO target_user_id, reporter
  FROM public.bookings WHERE id = booking_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Buchung nicht gefunden';
  END IF;

  IF reporter != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nur der Melder kann dies rückgängig machen.';
  END IF;

  UPDATE public.bookings
  SET charging_status = 'unknown', reporter_id = NULL
  WHERE id = booking_id;

  UPDATE public.profiles SET banned_until = NULL WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Gamification: booking_count Computed Column (05 + 06) ---
-- Gemeldete Ladungen zählen nicht.
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

-- 11. Realtime für bookings (06) ------------------------------
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

-- 12. Storage: Avatar Bucket + Policies (04) -----------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar"      ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar"      ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar"      ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ( bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING ( bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING ( bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

-- ============================================================
-- FERTIG. Optional: ersten Admin festlegen (nach Registrierung):
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'deine@email.de';
-- ============================================================
