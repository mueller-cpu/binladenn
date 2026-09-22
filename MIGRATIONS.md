# Database Migrations

Dokumentation aller durchgeführten Datenbank-Migrationen für das Binladenn-Projekt.

`supabase_setup.sql` ist das vollständige, idempotente Rebuild-Skript und entspricht immer dem Endzustand aller Migrationen.

## 2026-09-22: Ein-Tap-Buchen, Verlängerung, abgesichertes Melden, Realtime

**Datei:** `06_one_tap_extension_realtime.sql`

**Status:** ⏳ Offen – im Supabase SQL-Editor ausführen

**Änderungen:**

1. `bookings_duration_check` → `CHECK (duration > 0 AND duration <= 24)`. Verlängerungen um 1 bis 2 Stunden und verkürzte Folgeslots brauchen freie Dauern.
2. Trigger `bookings_enforce_ban`: Gesperrte Nutzer können weder buchen noch wiederherstellen noch verlängern. Bisher wurde die Sperre nur im Browser geprüft.
3. `report_booking_abuse` prüft jetzt: fremde Buchung, aktiv, gerade laufend, noch nicht gemeldet. Bisher konnte jeder jede Buchung melden, auch zukünftige.
4. `booking_count` zählt gemeldete Ladungen nicht mehr als Punkte.
5. `bookings_read` erlaubt allen Authentifizierten alle Zeilen. Nötig, damit Supabase Realtime auch Stornierungen anderer zustellt. Die App filtert überall auf `status = 'active'`.
6. `bookings` wird zur Publication `supabase_realtime` hinzugefügt.

**Ohne diese Migration:** Die App läuft, aber Verlängerungen auf 7 Stunden schlagen fehl, Änderungen anderer erscheinen erst nach Neuladen, und Sperre sowie Melde-Regeln gelten nur im Browser.

---

## 2026-02-17: Update Timeslot Durations

**Problem:**
Die Timeslots wurden im Frontend von:
- Vormittag: 08:00-12:00 (4h)
- Nachmittag: 12:00-18:00 (6h)
- Nacht: 18:00-08:00 (14h)

auf:
- Vormittag: 08:00-13:00 (5h)
- Nachmittag: 13:00-18:00 (5h)
- Nacht: 18:00-08:00 (14h)

geändert. Das ursprüngliche Database Constraint erlaubte nur `duration IN (4, 8)`, was zu Booking-Fehlern führte.

**Durchgeführte Migrationen:**

1. **`remove_duration_constraint_temporarily`**
   - Entfernt das alte Duration-Constraint

2. **`add_flexible_duration_constraint`**
   - Fügt neues Constraint hinzu: `duration IN (4, 5, 6, 14)`
   - Erlaubt sowohl alte als auch neue Durationen
   - Bestehende Buchungen bleiben gültig
   - Neue Buchungen verwenden die neuen Timeslots (5h, 5h, 14h)

**Status:** ✅ Erfolgreich durchgeführt in Supabase (ersetzt durch Migration 06)
