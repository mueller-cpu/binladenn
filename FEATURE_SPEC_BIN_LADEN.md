# Feature Specification: Bin Laden - Ladesäulen-Management-App

**Version:** 1.0
**Datum:** 08.02.2026
**Status:** Draft

---

## 1. Projekt-Übersicht

### 1.1 Zielsetzung
Eine Web-Applikation zur Verwaltung einer Firmen-Ladesäule, die es Mitarbeitern ermöglicht, Ladezeiten zu buchen, zu verwalten und die Verfügbarkeit transparent für alle Teammitglieder darzustellen.

### 1.2 Zielgruppe
- Mitarbeiter einer Firma mit Zugang zu einer gemeinsamen Elektroauto-Ladesäule
- Administratoren zur Verwaltung des Systems

### 1.3 Technologie-Stack
- **Frontend:** Next.js 16 (React 19)
- **Backend/Database:** Supabase
- **Authentication:** Supabase Auth (Email/Password)
- **Styling:** Tailwind CSS, shadcn/ui
- **Design-Ansatz:** Mobile-First

---

## 2. Benutzerrollen

### 2.1 Admin
**Berechtigungen:**
- Alle Rechte eines normalen Users
- User-Verwaltung (hinzufügen, entfernen, deaktivieren)
- Buchungen aller User einsehen, bearbeiten und löschen
- System-Einstellungen verwalten
- Statistiken/Reports einsehen

### 2.2 Normaler User
**Berechtigungen:**
- Eigene Buchungen erstellen (4h oder 8h Blöcke)
- Eigene Buchungen bearbeiten und stornieren
- Alle Buchungen im Kalender einsehen (inkl. Namen der Bucher)
- Profil verwalten
- E-Mail-Benachrichtigungen erhalten

---

## 3. Core Features

### 3.1 Authentifizierung & Autorisierung

#### F-001: User-Registrierung
- **Beschreibung:** Neue Mitarbeiter können sich selbst registrieren (offene Registrierung)
- **Felder:**
  - E-Mail-Adresse (alle Domains erlaubt)
  - Passwort (min. 8 Zeichen)
  - Vor- und Nachname
  - Optionale Telefonnummer
- **Validierung:**
  - E-Mail-Format-Prüfung
  - Passwort-Stärke-Prüfung
  - E-Mail-Verifikation per Link
- **Edge Cases:**
  - Doppelte E-Mail-Adressen verhindern
  - Neue User standardmäßig als "normaler User" (nicht Admin)
- **Zugriff:** Offene Registrierung, keine Domain-Beschränkung

#### F-002: Login
- **Beschreibung:** User können sich mit E-Mail und Passwort einloggen
- **Features:**
  - "Passwort vergessen" Funktion
  - Session-Management (Token-basiert via Supabase)
  - "Angemeldet bleiben" Option
- **Security:**
  - Rate Limiting für Login-Versuche
  - Sichere Passwort-Speicherung (Supabase übernimmt dies)

#### F-003: Profilverwaltung
- **Beschreibung:** User können ihr Profil bearbeiten
- **Editierbare Felder:**
  - Name
  - Telefonnummer
  - Passwort ändern
  - E-Mail-Benachrichtigungseinstellungen

---

### 3.2 Buchungssystem

#### F-004: Buchung erstellen
- **Zeiteinheiten:** 4-Stunden-Blöcke
- **Buchungsoptionen:**
  - Einzelbuchung: 4 Stunden
  - Doppelbuchung: 8 Stunden (2 x 4h Blöcke)
- **Zeitslots:**
  - 00:00 - 04:00
  - 04:00 - 08:00
  - 08:00 - 12:00
  - 12:00 - 16:00
  - 16:00 - 20:00
  - 20:00 - 00:00
- **Buchungszeitraum:** Bis zu 7 Tage im Voraus
- **Mehrfachbuchungen:** User können mehrere Zeitslots gleichzeitig buchen
- **Buchungslimit:** Maximal 3 aktive zukünftige Buchungen pro User
- **Validierung:**
  - Slot muss verfügbar sein
  - Nicht in der Vergangenheit
  - Maximal 7 Tage im Voraus
  - User hat noch keine 3 aktiven zukünftigen Buchungen (Fehlermeldung: "Du hast bereits 3 zukünftige Buchungen. Bitte storniere eine Buchung, um eine neue zu erstellen.")

#### F-005: Buchung bearbeiten
- **Beschreibung:** User können eigene Buchungen ändern
- **Änderbare Attribute:**
  - Datum/Uhrzeit (auf anderen verfügbaren Slot verschieben)
  - Dauer (4h auf 8h erweitern oder umgekehrt)
- **Einschränkungen:**
  - Nur eigene Buchungen (außer Admin)
  - Nur zukünftige Buchungen
  - Neue Zeit muss verfügbar sein

#### F-006: Buchung stornieren
- **Beschreibung:** User können eigene Buchungen jederzeit löschen
- **Features:**
  - Bestätigungsdialog vor Löschung
  - Optional: Stornierungsgrund (für Admin-Statistik)
  - E-Mail-Benachrichtigung bei Stornierung
  - Keine Mindestvorlaufzeit (Late-Cancellation erlaubt)
- **Einschränkungen:**
  - Nur eigene Buchungen (außer Admin)
- **No-Show-Handling:** Keine automatische Erfassung oder Konsequenzen

---

### 3.3 Kalenderansicht

#### F-007: Kalender-Interface
- **Ansichten:**
  - **Tagesansicht:** Alle 6 Zeitslots des Tages mit Status
  - **Wochenansicht:** 7 Tage mit Zeitslots
  - **Monatsansicht:** Überblick über gebuchte Tage
- **Informationen pro Slot:**
  - Status: Frei / Gebucht
  - Bei "Gebucht": Name des Users
  - Eigene Buchungen visuell hervorheben
- **Interaktion:**
  - Klick auf freien Slot → Buchungsdialog
  - Klick auf eigene Buchung → Bearbeiten/Stornieren
  - Klick auf fremde Buchung → Info anzeigen (nur Name + Zeit)
- **Mobile-Optimierung:**
  - Touch-friendly
  - Wischgesten für Navigation (prev/next day/week)
  - Responsive Layout

#### F-008: Filterung & Navigation
- **Features:**
  - Schnellnavigation: Heute, Diese Woche, Nächste Woche
  - Datum-Picker für direkte Navigation
  - "Zu meinen Buchungen springen"
  - Optional: Filter "Nur verfügbare Slots anzeigen"

---

### 3.4 Benachrichtigungssystem

#### F-009: E-Mail-Benachrichtigungen
- **Trigger:**
  1. **Buchungsbestätigung:** Direkt nach Erstellung
  2. **Erinnerung:** 24 Stunden vor Buchungsbeginn
  3. **Stornierungsbestätigung:** Bei Löschung einer Buchung
  4. **Änderungsbenachrichtigung:** Bei Bearbeitung einer Buchung
- **E-Mail-Inhalt:**
  - Datum und Uhrzeit der Buchung
  - Dauer (4h oder 8h)
  - Aktions-Buttons: "Buchung verwalten", "Stornieren"
- **Einstellungen:**
  - User können Benachrichtigungen in den Profileinstellungen deaktivieren
  - Ausnahme: Stornierungsbestätigung ist verpflichtend

---

### 3.5 Admin-Features

#### F-010: User-Verwaltung
- **Features:**
  - Liste aller registrierten User
  - User-Details anzeigen (Name, E-Mail, Anzahl Buchungen)
  - User deaktivieren/aktivieren
  - User-Rolle ändern (User ↔ Admin)
  - User löschen (mit Warnung bei aktiven Buchungen)

#### F-011: Buchungs-Management
- **Features:**
  - Alle Buchungen aller User einsehen
  - Fremde Buchungen bearbeiten/löschen (mit Hinweis an betroffenen User)
  - "Not-Buchung" erstellen (z.B. für Wartungsarbeiten)
    - Blockiert Zeitslots
    - Mit Hinweistext (z.B. "Wartung", "Defekt")

#### F-012: Dashboard & Statistiken
- **Metriken:**
  - Auslastung der Ladesäule (% gebuchte Slots)
  - Top-User (meiste Buchungen)
  - Durchschnittliche Buchungsdauer
  - Anzahl Stornierungen
- **Zeiträume:** Letzte Woche, Letzter Monat, Letztes Quartal

---

## 4. User Stories

### 4.1 Als normaler User

**US-001:** Als Mitarbeiter möchte ich mich registrieren, damit ich die Ladesäule nutzen kann.
- **Akzeptanzkriterien:**
  - Registrierungsformular ist vorhanden
  - E-Mail-Verifikation funktioniert
  - Nach Verifikation kann ich mich einloggen

**US-002:** Als Mitarbeiter möchte ich verfügbare Ladezeiten sehen, damit ich planen kann, wann ich laden kann.
- **Akzeptanzkriterien:**
  - Kalender zeigt freie und belegte Slots
  - Ich kann zwischen Tag/Woche/Monat wechseln
  - Eigene Buchungen sind hervorgehoben

**US-003:** Als Mitarbeiter möchte ich einen 4-Stunden-Slot buchen, damit ich mein E-Auto laden kann.
- **Akzeptanzkriterien:**
  - Klick auf freien Slot öffnet Buchungsdialog
  - Buchung wird gespeichert
  - Ich erhalte eine Bestätigungs-E-Mail
  - Kalender aktualisiert sich sofort

**US-004:** Als Mitarbeiter möchte ich sehen, wer die Ladesäule wann nutzt, damit ich ggf. persönlich Kontakt aufnehmen kann.
- **Akzeptanzkriterien:**
  - Bei gebuchten Slots wird der Name angezeigt
  - Ich kann den Namen sehen (nicht nur "belegt")

**US-005:** Als Mitarbeiter möchte ich meine Buchung verschieben, falls sich meine Pläne ändern.
- **Akzeptanzkriterien:**
  - Klick auf eigene Buchung zeigt "Bearbeiten" Option
  - Ich kann neues Datum/Zeit wählen
  - System prüft Verfügbarkeit
  - Ich erhalte eine Änderungs-E-Mail

**US-006:** Als Mitarbeiter möchte ich 24h vor meiner Buchung erinnert werden, damit ich nicht vergesse, mein Auto anzuschließen.
- **Akzeptanzkriterien:**
  - E-Mail wird automatisch 24h vorher versendet
  - E-Mail enthält Datum, Zeit und Dauer

**US-007:** Als Mitarbeiter möchte ich eine 8-Stunden-Buchung machen, falls ich länger laden muss.
- **Akzeptanzkriterien:**
  - Im Buchungsdialog kann ich 4h oder 8h wählen
  - 8h-Buchung blockiert 2 aufeinanderfolgende Slots
  - System prüft, ob beide Slots frei sind

### 4.2 Als Admin

**US-008:** Als Admin möchte ich alle User verwalten, damit ich neue Mitarbeiter hinzufügen und alte entfernen kann.
- **Akzeptanzkriterien:**
  - Ich sehe eine Liste aller User
  - Ich kann User deaktivieren/löschen
  - Ich kann User-Rollen ändern

**US-009:** Als Admin möchte ich Wartungszeiten blockieren, damit niemand buchen kann, wenn die Säule nicht verfügbar ist.
- **Akzeptanzkriterien:**
  - Ich kann Slots als "Wartung" markieren
  - Diese Slots sind für normale User nicht buchbar
  - Im Kalender wird "Wartung" angezeigt

**US-010:** Als Admin möchte ich Statistiken sehen, um die Auslastung zu analysieren.
- **Akzeptanzkriterien:**
  - Dashboard zeigt Auslastung in %
  - Ich sehe Top-User
  - Ich kann verschiedene Zeiträume wählen

---

## 5. Datenbank-Schema (Supabase)

### 5.1 Tabelle: `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (to see who booked)
CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 5.2 Tabelle: `bookings`
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL CHECK (duration IN (4, 8)), -- in hours
  booking_type TEXT NOT NULL DEFAULT 'regular' CHECK (booking_type IN ('regular', 'maintenance')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status = 'active')
);

-- Indexes
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status ON bookings(status);

-- RLS Policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can read all active bookings
CREATE POLICY "Users can read all active bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Users can insert their own bookings
CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update/delete their own bookings
CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all bookings
CREATE POLICY "Admins can manage all bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 5.3 Tabelle: `notification_log`
```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('confirmation', 'reminder', 'cancellation', 'modification')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_status TEXT NOT NULL CHECK (email_status IN ('sent', 'failed', 'pending'))
);

CREATE INDEX idx_notification_log_booking_id ON notification_log(booking_id);
CREATE INDEX idx_notification_log_user_id ON notification_log(user_id);
```

---

## 6. UI/UX Spezifikationen

### 6.1 Mobile-First Design Prinzipien
- **Touchscreen-optimiert:** Buttons min. 44x44px
- **Einfache Navigation:** Bottom Tab Bar für Hauptnavigation
- **Reduzierte Komplexität:** Max. 3 Aktionen pro Screen
- **Schneller Zugriff:** Wichtigste Funktion (Kalender) als Default-Screen

### 6.2 Farbschema & Branding
- **Primary Color:** Elektro-Blau/Grün (assoziiert mit E-Mobilität)
- **Status-Farben:**
  - Verfügbar: Grün (#10B981)
  - Gebucht: Rot (#EF4444)
  - Eigene Buchung: Blau (#3B82F6)
  - Wartung: Gelb/Orange (#F59E0B)

### 6.3 Komponenten-Übersicht

#### Navigation (Bottom Tab Bar - Mobile)
1. **Kalender** (Home-Icon) - Default
2. **Meine Buchungen** (List-Icon)
3. **Profil** (User-Icon)
4. **Admin** (Shield-Icon) - Nur für Admins sichtbar

#### Desktop Navigation (Sidebar)
- Gleiche Struktur, aber als vertikale Sidebar links

### 6.4 Screen-Flows

#### Flow 1: Neue Buchung erstellen
1. User öffnet Kalender (Default-Screen)
2. Wählt Ansicht (Tag/Woche/Monat)
3. Navigiert zum gewünschten Datum
4. Tippt auf freien Slot
5. **Buchungs-Dialog öffnet sich:**
   - Datum & Zeitslot angezeigt
   - Radio-Buttons: 4h oder 8h
   - Optional: Notiz-Feld
   - Buttons: "Abbrechen" | "Buchen"
6. Nach Bestätigung: Success-Toast + Kalender aktualisiert sich
7. E-Mail wird versendet

#### Flow 2: Buchung bearbeiten
1. User tippt auf eigene Buchung im Kalender
2. **Edit-Dialog öffnet sich:**
   - Aktuelle Details angezeigt
   - Button "Verschieben" → Öffnet Kalender-Picker
   - Button "Dauer ändern" → Toggle 4h/8h
   - Button "Stornieren" → Confirmation-Dialog
3. Nach Änderung: Success-Toast + E-Mail

#### Flow 3: Admin - Wartung planen
1. Admin öffnet Admin-Panel
2. Wählt "Wartung planen"
3. Kalender öffnet sich
4. Wählt Zeitraum aus
5. **Wartungs-Dialog:**
   - Start/End-Zeit
   - Grund (Text-Feld)
   - Button "Blockieren"
6. Slots werden als "Wartung" markiert

---

## 7. Technische Anforderungen

### 7.1 Performance
- **Initial Load:** < 3s
- **Time to Interactive:** < 5s
- **API Response Time:** < 500ms
- **Offline-Modus:** Basic Kalender-Ansicht cached (read-only)

### 7.2 Security
- **Authentication:** Supabase Auth mit Email/Password
- **Authorization:** Row Level Security (RLS) in Supabase
- **Booking Limits:**
  - Max. 3 aktive zukünftige Buchungen pro User (Business Rule)
  - Max. 5 Buchungsversuche pro User pro Tag (Rate Limiting gegen Spam)
- **Input Validation:** Client + Server-seitig
- **HTTPS:** Verpflichtend für Produktion

### 7.3 Browser-Support
- **Mobile:** iOS Safari 14+, Chrome Android 90+
- **Desktop:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### 7.4 Notifications
- **E-Mail Service:** Supabase Edge Functions + Resend/SendGrid
- **Trigger:** Supabase Database Triggers (Webhooks)
- **Scheduled Reminders:** Supabase Edge Functions mit Cron

---

## 8. Implementierungs-Phasen

### Phase 1: MVP (2-3 Wochen)
- ✅ User Registration/Login
- ✅ Basis Profilverwaltung
- ✅ Kalender mit Tagesansicht
- ✅ Einfache Buchung (4h Slots)
- ✅ Eigene Buchungen anzeigen
- ✅ Buchung stornieren
- ✅ Basis E-Mail-Benachrichtigungen (Bestätigung)

### Phase 2: Erweiterte Features (2 Wochen)
- ✅ Wochenansicht & Monatsansicht
- ✅ 8h-Buchungen
- ✅ Buchungen bearbeiten
- ✅ Erinnerungs-E-Mails (24h vorher)
- ✅ Namen bei Buchungen anzeigen
- ✅ Mobile-Optimierung verfeinern

### Phase 3: Admin-Features (1-2 Wochen)
- ✅ Admin-Panel
- ✅ User-Verwaltung
- ✅ Wartungs-Buchungen
- ✅ Basis-Statistiken
- ✅ Admin kann alle Buchungen verwalten

### Phase 4: Polish & Launch (1 Woche)
- ✅ UI/UX Feinschliff
- ✅ Testing (Unit + E2E)
- ✅ Performance-Optimierung
- ✅ Dokumentation
- ✅ Deployment auf Vercel/Netlify

---

## 9. Geklärt: Requirements-Entscheidungen

### ✅ Geklärte Anforderungen:
1. **E-Mail-Domain-Beschränkung:** ❌ NEIN - Alle E-Mail-Domains sind erlaubt
2. **Registrierungs-Prozess:** ✅ Offene Registrierung - Jeder kann sich selbst registrieren
3. **Buchungs-Limit:** ✅ Maximal 3 aktive zukünftige Buchungen pro User
4. **Late-Cancellation:** ❌ NEIN - Keine Mindestvorlaufzeit, Stornierung jederzeit möglich
5. **No-Show-Policy:** ❌ NEIN - System erfasst keine No-Shows, keine Konsequenzen

### Future Enhancements (Post-Launch):
- 📱 Native Mobile App (React Native)
- 🔔 Push-Notifications (zusätzlich zu E-Mail)
- 📊 Erweiterte Analytics & Reports
- 🤖 Automatische Slot-Vorschläge basierend auf Verfügbarkeit
- 💬 In-App Chat zwischen Usern (Slot-Tausch anfragen)
- 🔌 Integration mit Ladesäulen-API (echte Stromverbrauchsdaten)
- 📅 iCal-Export (Buchungen in Kalender-App synchronisieren)
- 🌐 Multi-Sprachen-Support (EN/DE)

---

## 10. Erfolgs-Metriken (KPIs)

### Nutzung
- **Daily Active Users (DAU):** Ziel > 70% der registrierten User
- **Buchungs-Rate:** Durchschnittlich > 15 Buchungen pro Woche
- **Auslastung:** > 60% der verfügbaren Slots gebucht

### User Experience
- **Time to Book:** Durchschnittlich < 30 Sekunden
- **Stornierungsrate:** < 10% der Buchungen
- **App-Load-Time:** < 3 Sekunden

### Technisch
- **Uptime:** > 99.5%
- **API Error Rate:** < 0.1%
- **E-Mail Delivery Rate:** > 98%

---

## 11. Risiken & Mitigation

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Doppelbuchungen durch Race Conditions | Mittel | Hoch | Database-Constraints + Optimistic Locking |
| E-Mail-Zustellung schlägt fehl | Mittel | Mittel | Retry-Logic + Fallback auf SMS |
| Hohe Auslastung → User finden keine Slots | Hoch | Mittel | Warteliste-Feature in Phase 4 |
| Admin-Account kompromittiert | Niedrig | Hoch | 2FA für Admins, Audit-Log |
| Mobile Performance schlecht | Mittel | Hoch | Lighthouse-Tests, Code-Splitting |

---

## 12. Anhang

### A. Beispiel: 4-Stunden-Slots über einen Tag
```
00:00 - 04:00  →  Slot 1
04:00 - 08:00  →  Slot 2
08:00 - 12:00  →  Slot 3
12:00 - 16:00  →  Slot 4
16:00 - 20:00  →  Slot 5
20:00 - 00:00  →  Slot 6
```

### B. Beispiel-E-Mail-Templates

#### Buchungsbestätigung
```
Betreff: ✅ Deine Ladezeit ist gebucht!

Hallo [Vorname],

deine Buchung wurde erfolgreich bestätigt:

📅 Datum: [Datum]
🕐 Zeit: [Start] - [Ende]
⏱️ Dauer: [4/8] Stunden

Du erhältst 24 Stunden vorher eine Erinnerung.

[Button: Buchung verwalten]  [Button: Stornieren]

Viele Grüße,
Dein Bin Laden Team
```

#### Erinnerung (24h vorher)
```
Betreff: 🔔 Erinnerung: Deine Ladezeit ist morgen!

Hallo [Vorname],

deine Ladezeit ist in 24 Stunden:

📅 Datum: [Datum]
🕐 Zeit: [Start] - [Ende]

Vergiss nicht, dein Fahrzeug rechtzeitig anzuschließen!

[Button: Buchung verwalten]  [Button: Stornieren]

Viele Grüße,
Dein Bin Laden Team
```

---

**Ende des Feature-Specs**

*Nächste Schritte: Review mit Stakeholdern → Freigabe → Start Implementierung Phase 1*
