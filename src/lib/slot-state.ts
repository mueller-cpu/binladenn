import { addDays, startOfDay } from 'date-fns';
import { TIME_SLOTS, TimeSlot, getSlotWindow, plusHours } from './booking-utils';
import type { Booking } from './types';

export const MAX_EXTENSION_HOURS = 2;

export type SlotKind = 'free' | 'own' | 'foreign';

export interface SlotState {
    kind: SlotKind;
    slot: TimeSlot;
    /** Kalendertag, zu dem der Slot gehört */
    date: Date;
    /** Fester Slot-Start */
    start: Date;
    /** Festes Slot-Ende */
    end: Date;
    /** Ab wann der Slot buchbar ist (= start, oder später bei verlängertem Vorgänger) */
    availableFrom: Date;
    isPast: boolean;
    isRunning: boolean;
    booking?: Booking;
    /** Stunden, die die eigene Buchung über das feste Slot-Ende hinausgeht (0..MAX) */
    extensionHours: number;
    canExtend: boolean;
    canShrink: boolean;
}

const HOUR = 3_600_000;

function isActive(b: Booking): boolean {
    return b.status === 'active';
}

function overlaps(b: Booking, start: Date, end: Date): boolean {
    return new Date(b.start_time) < end && new Date(b.end_time) > start;
}

export function getSlotState(
    date: Date,
    slot: TimeSlot,
    bookings: Booking[],
    userId: string | null,
    now: Date,
): SlotState {
    const { start, end } = getSlotWindow(date, slot);
    const active = bookings.filter(isActive);

    // Die Buchung, die in diesem Slot beginnt, "besitzt" den Slot.
    let slotBooking = active.find(b => {
        const s = new Date(b.start_time);
        return s >= start && s < end;
    });

    // Buchungen, die vor dem Slot beginnen und in ihn hineinreichen (Verlängerungen).
    const spill = active.filter(b => new Date(b.start_time) < start && new Date(b.end_time) > start);
    let availableFrom = start;
    for (const b of spill) {
        const e = new Date(b.end_time);
        if (e > availableFrom) availableFrom = e;
    }

    // Deckt eine hereinreichende Buchung den ganzen Slot ab, gehört er ihr.
    if (!slotBooking && availableFrom >= end) {
        slotBooking = spill.find(b => new Date(b.end_time).getTime() === availableFrom.getTime());
    }

    if (slotBooking) {
        const bStart = new Date(slotBooking.start_time);
        const bEnd = new Date(slotBooking.end_time);
        const kind: SlotKind = userId !== null && slotBooking.user_id === userId ? 'own' : 'foreign';
        const extensionHours = Math.max(0, Math.round((bEnd.getTime() - end.getTime()) / HOUR));
        const isPast = now >= bEnd;
        const isRunning = bStart <= now && now < bEnd;

        let canExtend = false;
        let canShrink = false;
        if (kind === 'own') {
            canShrink = extensionHours > 0;
            const extendedEnd = plusHours(bEnd, 1);
            const blocked = active.some(b => b.id !== slotBooking!.id && overlaps(b, bEnd, extendedEnd));
            canExtend = extensionHours < MAX_EXTENSION_HOURS && extendedEnd > now && !blocked;
        }

        return {
            kind, slot, date, start, end,
            availableFrom: start,
            isPast, isRunning,
            booking: slotBooking,
            extensionHours, canExtend, canShrink,
        };
    }

    return {
        kind: 'free', slot, date, start, end,
        availableFrom,
        isPast: now >= end,
        isRunning: start <= now && now < end,
        extensionHours: 0,
        canExtend: false,
        canShrink: false,
    };
}

export function slotStatesForDay(date: Date, bookings: Booking[], userId: string | null, now: Date): SlotState[] {
    return TIME_SLOTS.map(slot => getSlotState(date, slot, bookings, userId, now));
}

/** Ordnet eine Buchung über ihre Startstunde einem festen Slot zu. */
export function slotForBooking(booking: Booking): TimeSlot {
    const hour = new Date(booking.start_time).getHours();
    for (const slot of TIME_SLOTS) {
        const slotEndHour = (slot.startHour + slot.duration) % 24;
        if (slotEndHour > slot.startHour) {
            if (hour >= slot.startHour && hour < slotEndHour) return slot;
        }
    }
    // Alles außerhalb der Tagesslots ist Nacht.
    return TIME_SLOTS[TIME_SLOTS.length - 1];
}

export interface NextFreeSlot {
    date: Date;
    slot: TimeSlot;
    start: Date;
    end: Date;
}

export function findNextFreeSlot(bookings: Booking[], now: Date, daysAhead = 7): NextFreeSlot | null {
    const today = startOfDay(now);
    for (let d = 0; d <= daysAhead; d++) {
        const date = addDays(today, d);
        for (const slot of TIME_SLOTS) {
            const state = getSlotState(date, slot, bookings, null, now);
            if (state.kind === 'free' && !state.isPast) {
                return { date, slot, start: state.availableFrom, end: state.end };
            }
        }
    }
    return null;
}
