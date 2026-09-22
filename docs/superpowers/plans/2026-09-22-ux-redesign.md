# UX-Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein-Tap-Buchen mit Undo und Verlängerung, abgesichertes Melden, Realtime, Statistik-Seite und ein konsistentes Neon-auf-Schwarz-Design für die Ladesäulen-App.

**Architecture:** Reine Logik (Slot-Zustand, Statistik-Aggregation) wandert in getestete Module unter `src/lib`. Ein Hook `useBookings` kapselt Supabase-Zugriffe, Realtime und optimistische Mutationen. Die Kalender-UI wird durch `DayTimeline`, `WeekGrid` und eine neue `SlotCard` ersetzt; eine `AppShell` steuert Navigation und Splash. Datenbankseitig sichern Trigger und gehärtete RPCs die Regeln ab.

**Tech Stack:** Next.js 16.1.1, React 19, TypeScript, Tailwind 3.4, shadcn/ui, Supabase JS 2.x (Realtime), date-fns 4, sonner, lucide-react, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-22-ux-redesign-design.md`

## Global Constraints

- Slots fest: Vormittag 08–13 (5h), Nachmittag 13–18 (5h), Nacht 18–08 (14h).
- Verlängerung nur nach hinten, 1h-Schritte, max. 2h, nur in freie Zeit.
- Keine Chart-Bibliothek. Keine Emojis. Icons nur lucide-react.
- Alle Texte Deutsch. Navigation: Kalender, Statistik, Profil.
- Dark-first mit Tokens aus Spec §9, Light-Mode bleibt nutzbar.
- Vitest für `src/lib/*.ts`; `npm test` muss grün sein; `npx tsc --noEmit` und `npx next build` müssen durchlaufen.
- Migration idempotent, `supabase_setup.sql` auf Endzustand bringen.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `vitest.config.ts` | Test-Runner, Alias `@` → `src` |
| `src/lib/booking-utils.ts` | Slot-Definitionen, Slot-Fenster, Formatierung (bestehend, erweitert) |
| `src/lib/slot-state.ts` | **neu** – Zustand eines Slots aus Buchungen, Verlängerungslogik, nächster freier Slot |
| `src/lib/stats.ts` | **neu** – Aggregationen für die Statistik-Seite |
| `src/lib/types.ts` | `Booking`, `Profile` (erweitert) |
| `src/hooks/useBookings.ts` | **neu** – Laden, Realtime, optimistische Mutationen |
| `src/hooks/useSwipe.ts` | **neu** – horizontale Wischgeste |
| `src/hooks/useRequireAuth.ts` | **neu** – Redirect nach `/login` ohne Session |
| `src/components/layout/AppShell.tsx` | **neu** – Navigation nur außerhalb von Auth-Routen |
| `src/components/layout/MobileNav.tsx`, `DesktopSidebar.tsx` | 3 Tabs, Glass, Deutsch |
| `src/components/layout/Splash.tsx` | **neu** – Logo-Animation |
| `src/components/calendar/SlotCard.tsx` | neu geschrieben – alle Zustände aus Spec §6 |
| `src/components/calendar/DayTimeline.tsx` | **neu** – ersetzt `DayView` |
| `src/components/calendar/WeekGrid.tsx` | **neu** – ersetzt `WeekView` |
| `src/components/calendar/CalendarHeader.tsx` | **neu** – Tag/Woche, ‹ Heute ›, Datum |
| `src/components/calendar/NextChargeCard.tsx` | **neu** |
| `src/components/calendar/ReportDialog.tsx` | **neu** – AlertDialog fürs Melden |
| `src/components/stats/*.tsx` | **neu** – BestChanceCard, OccupancyTile, Heatmap, SlotBars, Leaderboard, MyStatsCard, RangeToggle |
| `src/app/page.tsx` | Splash + Redirect |
| `src/app/overview/page.tsx` | Dashboard + Kalender |
| `src/app/stats/page.tsx` | **neu** |
| `src/app/profile/page.tsx` | ohne Level-Dialog, Link zu Statistik und Verlauf |
| `src/app/bookings/page.tsx` | Verlauf, Storno mit Undo |
| `src/app/login/page.tsx` | Redirects, ohne toten Link |
| `src/app/layout.tsx` | Fonts, AppShell, Toaster |
| `src/app/globals.css`, `tailwind.config.ts` | Tokens, Glass, Keyframes |
| `06_one_tap_extension_realtime.sql`, `supabase_setup.sql`, `MIGRATIONS.md` | Datenbank |
| gelöscht | `onboarding/StartScreen.tsx`, `onboarding/FeatureSlider.tsx`, `booking/BookingDialog.tsx`, `calendar/DayView.tsx`, `calendar/WeekView.tsx` |

---

### Task 1: Test-Tooling

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (Script `test`)

- [ ] Vitest-Konfiguration mit Alias `@` → `./src`, `include: ['src/**/*.test.ts']`, `environment: 'node'`.
- [ ] `"test": "vitest run"` in `package.json`.
- [ ] `npm test` läuft durch (0 Tests, kein Fehler).
- [ ] Commit `chore: add vitest`.

### Task 2: Slot-Zustandsmodell

**Files:**
- Create: `src/lib/slot-state.ts`, `src/lib/__tests__/slot-state.test.ts`
- Modify: `src/lib/booking-utils.ts` (`getSlotWindow`, `hoursBetween`), `src/lib/types.ts`

**Interfaces (Produces):**
```ts
export const MAX_EXTENSION_HOURS = 2;
export type SlotKind = 'free' | 'own' | 'foreign';
export interface SlotState { kind; slot; date; start; end; availableFrom; isPast; isRunning; booking?; extensionHours; canExtend; canShrink }
export function getSlotState(date: Date, slot: TimeSlot, bookings: Booking[], userId: string | null, now: Date): SlotState
export function slotForBooking(booking: Booking): TimeSlot
export function findNextFreeSlot(bookings: Booking[], now: Date, daysAhead = 7): { date: Date; slot: TimeSlot; start: Date; end: Date } | null
export function slotStatesForDay(date: Date, bookings: Booking[], userId: string | null, now: Date): SlotState[]
```

Testfälle (jeder einzeln RED → GREEN):
- [ ] leerer Slot in der Zukunft → `free`, `availableFrom = start`, `isPast = false`
- [ ] Slot, dessen Ende vor `now` liegt → `isPast = true`
- [ ] Buchung des Users mit Start im Slot → `own`, `extensionHours = 0`, `canExtend = true`, `canShrink = false`
- [ ] fremde Buchung → `foreign`
- [ ] Vorgänger bis 14:00 verlängert → Nachmittag `free` mit `availableFrom = 14:00`
- [ ] eigene Buchung bis 14:00 → `extensionHours = 1`, `canShrink = true`
- [ ] eigene Buchung bis 15:00 → `canExtend = false` (Maximum)
- [ ] Folgeslot belegt → `canExtend = false`
- [ ] Nacht-Slot bis 09:00 verlängert → Vormittag des Folgetags `availableFrom = 09:00`
- [ ] `isRunning` bei `now` im Fenster
- [ ] stornierte Buchungen werden ignoriert
- [ ] `slotForBooking` ordnet 14:00-Start dem Nachmittag, 09:00-Start dem Vormittag, 02:00-Start der Nacht zu
- [ ] `findNextFreeSlot` überspringt belegte und vergangene Slots
- [ ] Commit `feat: slot state engine with extension rules`

### Task 3: Design-Foundation, Shell, Splash, Auth-Redirects

**Files:**
- Modify: `src/app/globals.css`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/components/layout/MobileNav.tsx`, `src/components/layout/DesktopSidebar.tsx`, `src/components/ui/button.tsx` (Primary-Glow), `src/app/manifest.ts`
- Create: `src/components/layout/AppShell.tsx`, `src/components/layout/Splash.tsx`, `src/hooks/useRequireAuth.ts`
- Delete: `src/components/onboarding/*`

- [ ] Tokens aus Spec §9 in `globals.css`, Utilities `.glass`, `.glass-hover`, `.glass-neon`, `.mesh-bg`, Keyframes `fade-in`, `splash-glow`; Tailwind-Farben `neon`, `warning`, Fonts `--font-biryani`, `--font-inter`.
- [ ] `layout.tsx`: Biryani + Inter via `next/font/google`, `AppShell`, ein globaler `Toaster` (`@/components/ui/sonner`, `position="top-center"`).
- [ ] `AppShell`: `usePathname`, auf `/`, `/login`, `/register` nur `children`, sonst Sidebar + Content (`md:pl-64`) + Bottom-Nav.
- [ ] Nav-Links: `/overview` Kalender (CalendarDays), `/stats` Statistik (BarChart3), `/profile` Profil (User). Aktiv: `text-neon bg-neon/8`.
- [ ] `Splash`: Zap 96 px `text-neon` mit `splash-glow`, Wortmarke Biryani „BIN LADEN“, Unterzeile „Ladesäule buchen“.
- [ ] `page.tsx`: Splash, nach `max(900 ms, auth geladen)` → `router.replace(user ? '/overview' : '/login')`.
- [ ] `login/page.tsx`: eingeloggt → `/overview`; Erfolg → `/overview`; Link „Passwort vergessen?“ entfernt; Card in Glass.
- [ ] `useRequireAuth()`: `{ user, isLoading }`, leitet nach `/login` um, wenn geladen und kein User.
- [ ] Onboarding-Komponenten löschen.
- [ ] `npx tsc --noEmit` grün, Commit `feat: neon design foundation, app shell, splash, auth redirects`.

### Task 4: Buchungs-Hook

**Files:**
- Create: `src/hooks/useBookings.ts`, `src/hooks/useSwipe.ts`
- Modify: `src/lib/types.ts` (`Profile`, `Booking.profiles` inkl. `booking_count`)

**Interfaces (Produces):**
```ts
export function useBookings(range: { from: Date; to: Date }, user: User | null): {
  bookings: Booking[]; loading: boolean; error: string | null;
  book(date: Date, slot: TimeSlot): Promise<void>;
  cancel(booking: Booking): Promise<void>;          // mit Undo-Toast
  extend(booking: Booking, delta: 1 | -1): Promise<void>;
  confirmCharging(booking: Booking): Promise<void>;
  report(booking: Booking): Promise<void>;
  undoReport(booking: Booking): Promise<void>;
  refetch(): Promise<void>;
}
export function useSwipe(onLeft: () => void, onRight: () => void, threshold = 60): { onTouchStart; onTouchEnd }
```

- [ ] Fetch mit Join `profiles:profiles!bookings_user_id_fkey(first_name,last_name,avatar_url,booking_count)`, Filter `start_time < to`, `end_time > from`, nur `status = 'active'` plus eigene stornierte nicht nötig → Filter `status.eq.active`.
- [ ] Realtime-Channel `bookings-live`, `postgres_changes` `*` auf `public.bookings`, Debounce 200 ms → stiller Refetch. Cleanup bei Unmount.
- [ ] Optimistische Mutationen wie Spec §5, Fehlertexte: `23P01` → „Der Slot wurde gerade vergeben.“, sonst `error.message`.
- [ ] `cancel`: Toast mit `action: { label: 'Rückgängig', onClick }`, `duration: 5000`.
- [ ] `navigator.vibrate?.(10)` bei book/cancel.
- [ ] Commit `feat: useBookings hook with optimistic updates and realtime`.

### Task 5: Kalender-UI

**Files:**
- Create: `SlotCard.tsx` (neu), `DayTimeline.tsx`, `WeekGrid.tsx`, `CalendarHeader.tsx`, `NextChargeCard.tsx`, `ReportDialog.tsx`
- Modify: `src/app/overview/page.tsx`
- Delete: `DayView.tsx`, `WeekView.tsx`, `BookingDialog.tsx`

- [ ] `SlotCard({ state, onBook, onCancel, onExtend, onConfirmCharging, onReport, onUndoReport })` rendert alle Zustände aus Spec §6 Tabelle; Controls mit `e.stopPropagation()`.
- [ ] `DayTimeline({ date, states, now, ...actions })`: `grid-cols-[3.5rem_1fr]`, Jetzt-Linie `top = elapsed/duration`.
- [ ] `WeekGrid({ weekStart, bookings, userId, now, onBook, onOpenDay })`: 7 Spalten × 3 Zeilen, Zellen 44 px, heute hervorgehoben.
- [ ] `CalendarHeader({ viewMode, onViewMode, date, onPrev, onNext, onToday })`, Label Tag: `EEEE, d. MMM`, Woche: `KW w · d.–d. MMM`.
- [ ] `NextChargeCard({ booking, onOpen })`.
- [ ] `ReportDialog({ booking, open, onOpenChange, onConfirm })`.
- [ ] `overview/page.tsx`: `useRequireAuth`, Range je View, Woche ab `startOfWeek(date, { weekStartsOn: 1 })`, Swipe, Skeletons beim ersten Laden.
- [ ] Alte Komponenten löschen, `tsc` grün, Commit `feat: one-tap calendar with timeline, week grid, extension and safe reporting`.

### Task 6: Statistik-Aggregation

**Files:**
- Create: `src/lib/stats.ts`, `src/lib/__tests__/stats.test.ts`

**Interfaces (Produces):**
```ts
export type StatsRange = '4w' | '3m' | 'all';
export function rangeStart(range: StatsRange, now: Date): Date | null
export function isCompleted(b: Booking, now: Date): boolean
export function occupancyMatrix(bookings, from: Date, to: Date): number[][]        // [weekday 0=Mo][slotIdx] 0..1
export function overallOccupancy(bookings, from: Date, to: Date): { booked: number; total: number; ratio: number }
export function slotDistribution(bookings, now): number[]                            // Anzahl je Slot-Index
export function leaderboard(bookings, now, limit = 5): LeaderEntry[]                 // { userId, firstName, lastName, avatarUrl, count, hours }
export function myStats(bookings, userId, now): MyStats                              // { monthCount, monthHours, favoriteSlot, streakWeeks, cancelRate, confirmedRate, extensions }
export function bestChances(matrix, futureBookings, now, limit = 3): Chance[]        // { date, slot, ratio }
export function extensionsPerSlot(bookings): number[]
```

Testfälle:
- [ ] `isCompleted`: aktiv und Ende ≤ now → true; Ende in Zukunft → false; storniert → false
- [ ] `occupancyMatrix`: 2 Wochen, Montag-Vormittag jede Woche gebucht → Zelle [0][0] = 1, andere 0
- [ ] `overallOccupancy`: 2 Tage à 3 Slots, 3 Buchungen → ratio 0.5
- [ ] `slotDistribution`: zählt nach `slotForBooking`
- [ ] `leaderboard`: sortiert absteigend, ignoriert `not_charging`, summiert Stunden
- [ ] `myStats`: Streak über 3 aufeinanderfolgende Wochen = 3; Lücke bricht ab; Storno-Quote 1 von 4 = 0.25
- [ ] `bestChances`: liefert freie Slots mit niedrigster Quote zuerst, überspringt belegte und vergangene
- [ ] `extensionsPerSlot`: Buchung 08–14 zählt als Verlängerung im Vormittag
- [ ] Commit `feat: statistics aggregation`

### Task 7: Statistik-Seite

**Files:**
- Create: `src/app/stats/page.tsx`, `src/components/stats/RangeToggle.tsx`, `BestChanceCard.tsx`, `OccupancyTile.tsx`, `Heatmap.tsx`, `SlotBars.tsx`, `Leaderboard.tsx`, `MyStatsCard.tsx`

- [ ] Vor Chart-Code den `dataviz`-Skill laden.
- [ ] Zwei Abfragen (Range-Historie, Zukunft bis Sonntag), Aggregation über `stats.ts`.
- [ ] Layout nach Spec §7, `space-y-8`, Karten `glass rounded-xl p-6`, Card-Titles Biryani `text-sm uppercase tracking-wider text-muted-foreground`.
- [ ] Heatmap: 7×3 CSS-Grid, Zellfarbe `hsl(var(--neon) / ratio*0.85 + 0.05)`, Prozent als `title` und bei Tap.
- [ ] Leerzustand ohne Buchungen: Icon `BarChart3` gedimmt + Text.
- [ ] Commit `feat: statistics page`

### Task 8: Profil und Verlauf

**Files:**
- Modify: `src/app/profile/page.tsx`, `src/app/bookings/page.tsx`

- [ ] Profil: Level-Dialog raus, Karte „Dein Rang“ mit Level-Icon, Titel, Punkten, Link „Zur Statistik“; Link „Buchungsverlauf“ → `/bookings`; Glass-Optik.
- [ ] Verlauf: `useRequireAuth`, Storno mit Undo-Toast statt `confirm()`, Glass-Optik, Zurück-Link.
- [ ] Commit `feat: profile and history pages in new design`

### Task 9: Datenbank

**Files:**
- Create: `06_one_tap_extension_realtime.sql`
- Modify: `supabase_setup.sql`, `MIGRATIONS.md`

- [ ] SQL nach Spec §3, idempotent.
- [ ] `supabase_setup.sql` auf Endzustand (Constraint, Trigger, RPC, booking_count, Policy, Publication).
- [ ] `MIGRATIONS.md`: Eintrag 2026-09-22 mit Status „offen, im SQL-Editor ausführen“.
- [ ] Commit `feat(db): ban trigger, hardened reporting, flexible durations, realtime`

### Task 10: Verifikation

- [ ] `npm test` grün
- [ ] `npx tsc --noEmit` grün
- [ ] `npx next build` grün
- [ ] Dev-Server starten, `/`, `/login`, `/overview`, `/stats`, `/profile`, `/bookings` liefern HTTP 200
- [ ] Abschlussbericht mit offenen Punkten (Migration ausführen)
