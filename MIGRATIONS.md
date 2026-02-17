# Database Migrations

Dokumentation aller durchgeführten Datenbank-Migrationen für das Binladenn-Projekt.

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

**Status:** ✅ Erfolgreich durchgeführt in Supabase
