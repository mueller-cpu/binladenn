# Bin Laden – UX-Redesign, Ein-Tap-Buchen, Verlängerung, Statistik

**Datum:** 2026-09-22
**Status:** Vom Product Owner im Chat freigegeben, Umsetzung läuft

## 1. Ziel

Die Ladesäulen-App soll sich in drei Sekunden bedienen lassen: App öffnen, Slot antippen, fertig.
Dazu kommen eine Statistik-Seite und ein konsistentes Neon-auf-Schwarz-Design.

Freigegebene Pakete:

1. Quick Wins: Onboarding raus, Splash, Login-Redirect, deutsche Labels, Heute-Button, Woche ab Montag, toter Link und Notizfeld weg.
2. Ein-Tap-Buchen mit Undo, Inline-Aktionen, abgesichertes Melden, Realtime.
3. Verlängerung um 1 bis 2 Stunden in den freien Nachbarslot (nur nach hinten).
4. Statistik-Seite.
5. Visuelles Redesign von Kalender und Navigation.

## 2. Globale Regeln

- Stack bleibt: Next.js 16.1.1, React 19, TypeScript strict, Tailwind 3.4, shadcn/ui, Supabase JS 2.x, date-fns 4, sonner, lucide-react.
- Keine neue Chart-Bibliothek. Heatmap und Balken sind CSS.
- Unit-Tests mit Vitest für alle reinen Logik-Module (`src/lib/*.ts`). Keine UI-Tests.
- Alle sichtbaren Texte auf Deutsch. Navigation: „Kalender“, „Statistik“, „Profil“.
- Slots bleiben fest: Vormittag 08:00–13:00 (5h), Nachmittag 13:00–18:00 (5h), Nacht 18:00–08:00 (14h, Folgetag).
- Verlängerung nur am Ende, in 1h-Schritten, maximal 2h, nur wenn der Zeitraum frei ist.
- Zeitberechnung immer in lokaler Zeit des Browsers (wie bisher).
- Icons ausschließlich lucide-react. Keine Emojis.
- Dark-first, Light-Mode bleibt nutzbar (Theme-Toggle im Profil existiert und bleibt).
- Migrationen idempotent; `supabase_setup.sql` bleibt das vollständige Rebuild-Skript.

## 3. Datenmodell und Datenbank

Keine neue Tabelle. Änderungen in `06_one_tap_extension_realtime.sql`:

1. `bookings_duration_check` wird zu `CHECK (duration > 0 AND duration <= 24)`. Verlängerte Buchungen haben 6 oder 7 Stunden, verkürzte Nachfolge-Slots 3 oder 4.
2. Trigger `bookings_enforce_ban` (BEFORE INSERT OR UPDATE OF status, start_time, end_time, WHEN NEW.status = 'active'): wirft `Du bist bis <Datum> gesperrt.` wenn `profiles.banned_until > now()`. Damit ist die Sperre serverseitig, auch für Undo und Verlängerung.
3. `report_booking_abuse` prüft: Buchung existiert, ist aktiv, gehört nicht dem Melder, läuft gerade (`start_time <= now() < end_time`), ist nicht schon gemeldet. Sonst Exception mit deutscher Meldung.
4. `booking_count` zählt nur abgeschlossene Buchungen mit `charging_status <> 'not_charging'`.
5. Lese-Policy `bookings_read` wird `USING (true)` für authenticated, damit Realtime auch Stornierungen anderer zustellt. UI filtert überall auf `status = 'active'`.
6. `bookings` wird zur Publication `supabase_realtime` hinzugefügt (idempotent über `pg_publication_tables`).

`supabase_setup.sql` wird auf diesen Endzustand gebracht. `MIGRATIONS.md` dokumentiert den Schritt.

## 4. Slot-Zustandsmodell (`src/lib/slot-state.ts`)

Reine Funktionen, vollständig getestet.

```ts
type SlotKind = 'free' | 'own' | 'foreign';

interface SlotState {
  kind: SlotKind;
  slot: TimeSlot;
  date: Date;              // Kalendertag des Slots
  start: Date;             // Slot-Start (fest)
  end: Date;               // Slot-Ende (fest)
  availableFrom: Date;     // = start, oder später, wenn ein Vorgänger verlängert hat
  isPast: boolean;         // now >= end
  isRunning: boolean;      // start <= now < end
  booking?: Booking;       // bei own/foreign
  extensionHours: number;  // 0..2, bei own: wie weit über end hinaus
  canExtend: boolean;      // own, extensionHours < 2, Folgestunde frei, verlängertes Ende in der Zukunft
  canShrink: boolean;      // own, extensionHours > 0
}
```

Regeln:

- Die Buchung, deren `start_time` in `[start, end)` liegt, ist die Slot-Buchung. Gehört sie dem User: `own`, sonst `foreign`.
- Gibt es keine Slot-Buchung, aber eine aktive Buchung, die vor `start` beginnt und nach `start` endet, ist der Slot `free` mit `availableFrom = deren end_time`.
- Eine Buchung entsteht mit `start_time = availableFrom` und `end_time = end`. `duration = Stunden(end - start_time)`.
- `canExtend` prüft nur Überlappung von `[booking.end, booking.end + 1h)` mit aktiven Buchungen. Damit funktioniert Nacht → nächster Vormittag ohne Sonderfall.
- `slotForBooking(booking)` ordnet über die Startstunde zu: 8–12 Vormittag, 13–17 Nachmittag, sonst Nacht.
- `findNextFreeSlot(bookings, now)` liefert den ersten freien, nicht vergangenen Slot innerhalb von 7 Tagen.

## 5. Buchungsaktionen (`src/hooks/useBookings.ts`)

Ein Hook kapselt Laden, Realtime und alle Mutationen mit optimistischem UI.

- `book(date, slot)`: Optimistische Karte sofort, Insert mit `.select('*, profiles(...)')`. Fehler `23P01` → „Der Slot wurde gerade vergeben.“ Trigger-Fehler → Meldung aus der Datenbank anzeigen. Kein Dialog, kein Notizfeld.
- `cancel(booking)`: Sofort entfernen, `status = 'cancelled'`. Toast „Buchung gelöscht“ mit Aktion „Rückgängig“ (5 s). Undo setzt `status = 'active'` auf derselben Zeile; bei `23P01` „Der Slot ist inzwischen vergeben.“
- `extend(booking, +1 | -1)`: `end_time` und `duration` anpassen, optimistisch, Konflikt wie oben.
- `confirmCharging(booking)`: `charging_status = 'charging'`.
- `report(booking)` / `undoReport(booking)`: RPC wie bisher, danach Refetch.
- Realtime: `postgres_changes` auf `bookings`, entprellter stiller Refetch (200 ms). Kein Spinner bei Refetch; Spinner nur beim ersten Laden.
- `navigator.vibrate(10)` bei Buchen und Löschen, wenn verfügbar.
- Ladebereich: Tag-Ansicht `[Tag - 1, Tag + 2)`, Wochenansicht `[Montag - 1, Montag + 8)`, damit Verlängerungen über Tagesgrenzen sichtbar sind.

## 6. Kalender-UI

**Startseite `/overview`:**

1. Kopf: „Ladekalender“ als Biryani-Headline, darunter Begrüßung mit Vornamen.
2. `NextChargeCard`: „Nächste Ladung · Do 25.09. · 13:00–18:00“, Tap springt in den Tag. Ohne Buchung: „Keine Ladung geplant. Tipp auf einen freien Slot.“
3. Steuerleiste: Segment „Tag | Woche“, rechts „‹ Heute ›“ und Datum bzw. „KW 39 · 22.–28. Sep“.
4. Tag: `DayTimeline`. Woche: `WeekGrid`. Beide reagieren auf horizontales Wischen (Touch, Schwelle 60 px).

**`DayTimeline`:** drei Zeilen, links Uhrzeit und Slot-Name, rechts `SlotCard`. Der laufende Slot zeigt eine horizontale Neon-Linie „Jetzt“ proportional zur verstrichenen Zeit.

**`SlotCard`-Zustände:**

| Zustand | Optik | Tap |
|---|---|---|
| free, Zukunft | Glass, 1 px Neon-Rahmen (0.3), „Frei“ oder „Frei ab 14:00“, „Tippen zum Buchen“ | bucht sofort |
| free, vorbei | Glass gedimmt, gestrichelter Rahmen, „Vorbei“ | nichts |
| own | Neon gefüllt, schwarzer Text, Zeitraum inkl. Verlängerung, Avatar „Du“. Controls: Stepper `– 14:00 +` (nur bei canShrink/canExtend), „Lade jetzt“ (nur wenn isRunning und nicht bestätigt), Badge „Lädt“ wenn bestätigt | löscht mit Undo. Controls stoppen die Propagation |
| own, vorbei | wie own, aber gedimmt, ohne Controls | nichts |
| foreign | Glass, Avatar + Name + Rang-Titel, Zeitraum. Badge „Lädt“ / „Gemeldet“ (roter Rahmen). Wenn isRunning: Menü „⋯“ | nichts, Menü öffnet Report |
| foreign, gemeldet, ich bin Melder | wie foreign, Menü „Meldung zurückziehen“ | Menü |

**Melden:** Menü „Lädt nicht melden“ → `AlertDialog` mit Name und Konsequenz („Max wird für 7 Tage gesperrt. Nur melden, wenn die Säule jetzt gerade nicht genutzt wird.“) → „Melden“. Die Datenbank erzwingt: nur laufende, fremde, aktive Buchungen.

**`WeekGrid`:** Kopfzeile Mo–So mit Datum, heute hervorgehoben. Drei Zeilen „VM / NM / N“. Zellen 44 px hoch:
free → gestrichelter Neon-Rahmen mit „+“, own → Neon gefüllt „Du“, foreign → Avatar oder Initialen neutral, vorbei → leer gedimmt.
Tap auf frei bucht. Tap auf belegt wechselt in die Tagesansicht dieses Tages.

## 7. Statistik-Seite `/stats`

Datenbasis: eine Abfrage aller Buchungen (inkl. Profile) ab Range-Start bis jetzt, plus eine Abfrage der Buchungen von jetzt bis Sonntag 24:00 für „Beste Chance“. Aggregation im Browser in `src/lib/stats.ts` (rein, getestet).

Range-Umschalter oben: „4 Wochen | 3 Monate | Gesamt“. Gilt für alle Blöcke außer „Meine Zahlen diesen Monat“.

| Block | Inhalt | Darstellung |
|---|---|---|
| Beste Chance | Die drei noch freien Slots dieser Woche mit der niedrigsten historischen Belegung, plus „Nächster freier Slot: heute 13:00“ | Karte mit drei Zeilen, Tap bucht nicht, verlinkt in den Kalender-Tag |
| Auslastung | Anteil belegter Slots im Range, Trend zur gleich langen Vorperiode (nicht bei „Gesamt“) | Stat-Tile, große Zahl |
| Heatmap | Wochentag × Slot, Belegungsquote 0–100 % als Neon-Deckkraft | CSS-Grid 7×3, Zellen mit Prozentwert bei Hover/Tap |
| Slot-Verteilung | Buchungen je Slot | drei horizontale Balken |
| Bestenliste | Top 5 nach abgeschlossenen Ladungen (ohne gemeldete), Stunden, Avatar, Rang-Icon | Liste, Platz 1 mit Neon-Akzent |
| Meine Zahlen | Diesen Monat: Ladungen, Stunden, Lieblings-Slot. Level mit Fortschritt zum nächsten. Streak in Wochen. Zuverlässigkeit: Storno-Quote und Anteil bestätigter Ladungen. Verlängerungen. | Zahlenraster 2×3, Progress, Micro-Labels |

Definitionen:

- Abgeschlossen: `status = 'active'` und `end_time <= now`.
- Belegungsquote einer Zelle: abgeschlossene Slots mit Buchung ÷ alle abgeschlossenen Slots dieses Wochentags im Range.
- Streak: aufeinanderfolgende ISO-Wochen bis einschließlich dieser oder der letzten Woche mit mindestens einer abgeschlossenen Ladung.
- Storno-Quote: eigene stornierte ÷ (stornierte + aktive) im Range.
- Verlängerung: Buchung, deren `end_time` nach dem festen Slot-Ende liegt.

Gamification wandert von der Profilseite hierher. Das Profil zeigt nur noch eine Zeile „Dein Rang: … → Statistik“.

## 8. Navigation, Shell, Splash

- `AppShell` (Client) rendert Sidebar und Bottom-Nav nur außerhalb von `/`, `/login`, `/register`.
- Tabs: Kalender (`/overview`, CalendarDays), Statistik (`/stats`, BarChart3), Profil (`/profile`, User).
- Bottom-Nav: Glass, `env(safe-area-inset-bottom)`. Sidebar: Glass 24 px Blur, aktiv = Neon-Text mit Neon/8-Hintergrund.
- `/`: Splash, Zap-Icon mit Glow-Animation und Wortmarke, mindestens 900 ms, dann `replace` nach `/overview` (eingeloggt) oder `/login`.
- `/login`: eingeloggt → `/overview`. Erfolg → `/overview`. Link „Passwort vergessen?“ entfällt.
- `/overview` und `/stats`: ohne Session → `/login`.
- `/bookings` bleibt als „Verlauf“ erhalten, aus dem Profil verlinkt, nicht in der Navigation. Stornieren dort ebenfalls mit Undo-Toast, ohne `confirm()`.
- Gelöscht: `StartScreen`, `FeatureSlider`, `BookingDialog`, `DayView`, `WeekView`.

## 9. Design-Tokens

Dark (Standard):

| Token | Wert |
|---|---|
| background | `200 20% 3%` (#060809) |
| foreground | `0 0% 93%` |
| card | `0 0% 7%` |
| primary / neon | `112 100% 50%` (#22ff00), foreground schwarz |
| muted | `0 0% 10%`, foreground `200 6% 59%` (#90989c) |
| border | `0 0% 14%` |
| destructive | `0 100% 63%` (#ff4444) |
| warning | `40 100% 50%` (#ffaa00) |
| radius | `0.75rem` |

Light: background `0 0% 98%`, foreground `200 20% 5%`, primary `112 80% 32%` mit weißem Text, border `0 0% 88%`, muted `0 0% 94%`.

Utilities in `globals.css`: `.glass`, `.glass-hover`, `.glass-neon` (eigene Buchung), `.mesh-bg` (nur dark), `@keyframes fade-in` (300 ms, 4 px), `@keyframes splash-glow`.
Schriften: Biryani 900 für Überschriften (`--font-biryani`, uppercase, tracking-wider), Inter für alles andere.
Bewegung: 200 ms UI-Transitions, nichts federt oder überschießt.

## 10. Nicht im Scope

- Passwort-Reset-Flow
- Serverseitiger Route-Guard (Proxy) mit Cookie-Auth
- E-Mail-Benachrichtigungen, Admin-Panel, Monatsansicht
- Verlängerung nach vorne
- Lint-Setup für Next 16
