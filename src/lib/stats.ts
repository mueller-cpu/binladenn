import { addDays, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { TIME_SLOTS, TimeSlot, getSlotWindow, hoursBetween } from './booking-utils';
import { getSlotState, slotForBooking } from './slot-state';
import type { Booking } from './types';

export type StatsRange = '4w' | '3m' | 'all';

const WEEK_STARTS_ON = 1 as const;

export function rangeStart(range: StatsRange, now: Date): Date | null {
    const day = startOfDay(now);
    if (range === '4w') return subDays(day, 28);
    if (range === '3m') return subMonths(day, 3);
    return null;
}

function isActive(b: Booking): boolean {
    return b.status === 'active';
}

/** Aktiv und beendet. Laufende und zukünftige Buchungen zählen nicht. */
export function isCompleted(b: Booking, now: Date): boolean {
    return isActive(b) && new Date(b.end_time) <= now;
}

function isCounted(b: Booking, now: Date): boolean {
    return isCompleted(b, now) && b.charging_status !== 'not_charging';
}

function weekdayIndex(date: Date): number {
    return (date.getDay() + 6) % 7;
}

function startsInWindow(b: Booking, start: Date, end: Date): boolean {
    const s = new Date(b.start_time);
    return s >= start && s < end;
}

function bookingHours(b: Booking): number {
    return hoursBetween(new Date(b.start_time), new Date(b.end_time));
}

/** Ruft cb für jedes Slot-Fenster auf, das vollständig in [from, to] liegt. */
function forEachSlotWindow(
    from: Date,
    to: Date,
    cb: (day: Date, weekday: number, slotIndex: number, start: Date, end: Date) => void,
) {
    for (let day = startOfDay(from); day < to; day = addDays(day, 1)) {
        const weekday = weekdayIndex(day);
        TIME_SLOTS.forEach((slot, i) => {
            const { start, end } = getSlotWindow(day, slot);
            if (end > to) return;
            cb(day, weekday, i, start, end);
        });
    }
}

function emptyMatrix(): number[][] {
    return Array.from({ length: 7 }, () => TIME_SLOTS.map(() => 0));
}

/** Belegungsquote [Wochentag 0=Mo..6=So][Slot-Index] zwischen 0 und 1. */
export function occupancyMatrix(bookings: Booking[], from: Date, to: Date): number[][] {
    const active = bookings.filter(isActive);
    const booked = emptyMatrix();
    const total = emptyMatrix();

    forEachSlotWindow(from, to, (_day, wd, i, start, end) => {
        total[wd][i] += 1;
        if (active.some(b => startsInWindow(b, start, end))) booked[wd][i] += 1;
    });

    return booked.map((row, wd) => row.map((v, i) => (total[wd][i] === 0 ? 0 : v / total[wd][i])));
}

export interface Occupancy {
    booked: number;
    total: number;
    ratio: number;
}

export function overallOccupancy(bookings: Booking[], from: Date, to: Date): Occupancy {
    const active = bookings.filter(isActive);
    let booked = 0;
    let total = 0;

    forEachSlotWindow(from, to, (_day, _wd, _i, start, end) => {
        total += 1;
        if (active.some(b => startsInWindow(b, start, end))) booked += 1;
    });

    return { booked, total, ratio: total === 0 ? 0 : booked / total };
}

/** Abgeschlossene Buchungen je Slot-Index. */
export function slotDistribution(bookings: Booking[], now: Date): number[] {
    const counts = TIME_SLOTS.map(() => 0);
    for (const b of bookings) {
        if (!isCompleted(b, now)) continue;
        counts[TIME_SLOTS.indexOf(slotForBooking(b))] += 1;
    }
    return counts;
}

export interface LeaderEntry {
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    count: number;
    hours: number;
}

export function leaderboard(bookings: Booking[], now: Date, limit = 5): LeaderEntry[] {
    const byUser = new Map<string, LeaderEntry>();

    for (const b of bookings) {
        if (!isCounted(b, now)) continue;
        const entry = byUser.get(b.user_id) ?? {
            userId: b.user_id,
            firstName: b.profiles?.first_name ?? 'Unbekannt',
            lastName: b.profiles?.last_name ?? '',
            avatarUrl: b.profiles?.avatar_url ?? null,
            count: 0,
            hours: 0,
        };
        entry.count += 1;
        entry.hours += bookingHours(b);
        byUser.set(b.user_id, entry);
    }

    return [...byUser.values()]
        .sort((a, b) => b.count - a.count || b.hours - a.hours || a.firstName.localeCompare(b.firstName))
        .slice(0, limit);
}

export interface MyStats {
    /** Abgeschlossene, nicht gemeldete Ladungen insgesamt (Basis der Punkte) */
    totalCount: number;
    monthCount: number;
    monthHours: number;
    favoriteSlot: TimeSlot | null;
    streakWeeks: number;
    /** Storniert ÷ (storniert + aktiv), null ohne Buchungen */
    cancelRate: number | null;
    /** Bestätigt ÷ abgeschlossen, null ohne abgeschlossene */
    confirmedRate: number | null;
    extensions: number;
}

export function myStats(bookings: Booking[], userId: string, now: Date): MyStats {
    const mine = bookings.filter(b => b.user_id === userId);
    const completed = mine.filter(b => isCompleted(b, now));
    const monthStart = startOfMonth(now);
    const thisMonth = completed.filter(b => new Date(b.start_time) >= monthStart);

    const slotCounts = TIME_SLOTS.map(() => 0);
    for (const b of completed) slotCounts[TIME_SLOTS.indexOf(slotForBooking(b))] += 1;
    const maxCount = Math.max(...slotCounts);
    const favoriteSlot = maxCount > 0 ? TIME_SLOTS[slotCounts.indexOf(maxCount)] : null;

    const weeksWithCharge = new Set(
        completed.map(b => startOfWeek(new Date(b.start_time), { weekStartsOn: WEEK_STARTS_ON }).getTime()),
    );
    let cursor = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON });
    if (!weeksWithCharge.has(cursor.getTime())) cursor = subWeeks(cursor, 1);
    let streakWeeks = 0;
    while (weeksWithCharge.has(cursor.getTime())) {
        streakWeeks += 1;
        cursor = subWeeks(cursor, 1);
    }

    const cancelled = mine.filter(b => b.status === 'cancelled').length;
    const activeCount = mine.filter(isActive).length;
    const cancelRate = cancelled + activeCount === 0 ? null : cancelled / (cancelled + activeCount);

    const confirmed = completed.filter(b => b.charging_status === 'charging').length;
    const confirmedRate = completed.length === 0 ? null : confirmed / completed.length;

    return {
        totalCount: mine.filter(b => isCounted(b, now)).length,
        monthCount: thisMonth.length,
        monthHours: thisMonth.reduce((sum, b) => sum + bookingHours(b), 0),
        favoriteSlot,
        streakWeeks,
        cancelRate,
        confirmedRate,
        extensions: extensionsPerSlot(mine).reduce((a, b) => a + b, 0),
    };
}

export interface Chance {
    date: Date;
    slot: TimeSlot;
    ratio: number;
    start: Date;
    end: Date;
}

/** Freie Slots der laufenden Woche, sortiert nach historischer Belegung (niedrig zuerst). */
export function bestChances(matrix: number[][], futureBookings: Booking[], now: Date, limit = 3): Chance[] {
    const weekStart = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON });
    const chances: Chance[] = [];

    for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        TIME_SLOTS.forEach((slot, i) => {
            const state = getSlotState(day, slot, futureBookings, null, now);
            if (state.kind !== 'free' || state.isPast) return;
            chances.push({ date: day, slot, ratio: matrix[d]?.[i] ?? 0, start: state.availableFrom, end: state.end });
        });
    }

    return chances
        .sort((a, b) => a.ratio - b.ratio || a.start.getTime() - b.start.getTime())
        .slice(0, limit);
}

/** Aktive Buchungen, deren Ende nach dem festen Slot-Ende liegt, je Slot-Index. */
export function extensionsPerSlot(bookings: Booking[]): number[] {
    const counts = TIME_SLOTS.map(() => 0);
    for (const b of bookings) {
        if (!isActive(b)) continue;
        const slot = slotForBooking(b);
        const start = new Date(b.start_time);
        const { end } = getSlotWindow(startOfDay(start), slot);
        if (new Date(b.end_time) > end) counts[TIME_SLOTS.indexOf(slot)] += 1;
    }
    return counts;
}
