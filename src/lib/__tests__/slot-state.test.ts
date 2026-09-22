import { describe, it, expect } from 'vitest';
import { TIME_SLOTS } from '@/lib/booking-utils';
import type { Booking } from '@/lib/types';
import {
    getSlotState,
    slotForBooking,
    findNextFreeSlot,
    slotStatesForDay,
    MAX_EXTENSION_HOURS,
} from '@/lib/slot-state';

const [VORMITTAG, NACHMITTAG, NACHT] = TIME_SLOTS;
const USER = 'user-1';
const OTHER = 'user-2';

// Dienstag, 22. September 2026 (lokale Zeit)
const day = new Date(2026, 8, 22);
const nextDay = new Date(2026, 8, 23);

function at(base: Date, hours: number, minutes = 0): Date {
    const d = new Date(base);
    d.setHours(hours, minutes, 0, 0);
    return d;
}

let idCounter = 0;
function booking(opts: {
    start: Date;
    end: Date;
    user?: string;
    status?: Booking['status'];
    charging_status?: Booking['charging_status'];
}): Booking {
    idCounter += 1;
    return {
        id: `b-${idCounter}`,
        user_id: opts.user ?? USER,
        start_time: opts.start.toISOString(),
        end_time: opts.end.toISOString(),
        duration: (opts.end.getTime() - opts.start.getTime()) / 3_600_000,
        status: opts.status ?? 'active',
        charging_status: opts.charging_status ?? 'unknown',
    };
}

describe('getSlotState – freie Slots', () => {
    it('leerer Slot in der Zukunft ist frei ab Slot-Start', () => {
        const state = getSlotState(day, VORMITTAG, [], USER, at(day, 7));
        expect(state.kind).toBe('free');
        expect(state.availableFrom.getTime()).toBe(at(day, 8).getTime());
        expect(state.start.getTime()).toBe(at(day, 8).getTime());
        expect(state.end.getTime()).toBe(at(day, 13).getTime());
        expect(state.isPast).toBe(false);
        expect(state.isRunning).toBe(false);
    });

    it('Slot ist vorbei, wenn sein Ende vor jetzt liegt', () => {
        const state = getSlotState(day, VORMITTAG, [], USER, at(day, 13, 30));
        expect(state.isPast).toBe(true);
    });

    it('Nachmittag ist frei ab 14:00, wenn der Vorgänger bis 14:00 verlängert hat', () => {
        const bookings = [booking({ start: at(day, 8), end: at(day, 14), user: OTHER })];
        const state = getSlotState(day, NACHMITTAG, bookings, USER, at(day, 7));
        expect(state.kind).toBe('free');
        expect(state.availableFrom.getTime()).toBe(at(day, 14).getTime());
    });

    it('Vormittag des Folgetags ist frei ab 09:00, wenn die Nacht bis 09:00 verlängert hat', () => {
        const bookings = [booking({ start: at(day, 18), end: at(nextDay, 9), user: OTHER })];
        const state = getSlotState(nextDay, VORMITTAG, bookings, USER, at(day, 20));
        expect(state.kind).toBe('free');
        expect(state.availableFrom.getTime()).toBe(at(nextDay, 9).getTime());
    });

    it('stornierte Buchungen werden ignoriert', () => {
        const bookings = [booking({ start: at(day, 8), end: at(day, 13), status: 'cancelled' })];
        const state = getSlotState(day, VORMITTAG, bookings, USER, at(day, 7));
        expect(state.kind).toBe('free');
    });
});

describe('getSlotState – eigene Buchung', () => {
    it('eigene Buchung ohne Verlängerung kann verlängert, aber nicht verkürzt werden', () => {
        const own = booking({ start: at(day, 8), end: at(day, 13) });
        const state = getSlotState(day, VORMITTAG, [own], USER, at(day, 7));
        expect(state.kind).toBe('own');
        expect(state.booking?.id).toBe(own.id);
        expect(state.extensionHours).toBe(0);
        expect(state.canExtend).toBe(true);
        expect(state.canShrink).toBe(false);
    });

    it('eine Stunde verlängert: kann weiter verlängert und verkürzt werden', () => {
        const own = booking({ start: at(day, 8), end: at(day, 14) });
        const state = getSlotState(day, VORMITTAG, [own], USER, at(day, 7));
        expect(state.extensionHours).toBe(1);
        expect(state.canExtend).toBe(true);
        expect(state.canShrink).toBe(true);
    });

    it('am Maximum kann nicht weiter verlängert werden', () => {
        const own = booking({ start: at(day, 8), end: at(day, 8 + 5 + MAX_EXTENSION_HOURS) });
        const state = getSlotState(day, VORMITTAG, [own], USER, at(day, 7));
        expect(state.extensionHours).toBe(MAX_EXTENSION_HOURS);
        expect(state.canExtend).toBe(false);
        expect(state.canShrink).toBe(true);
    });

    it('kann nicht verlängern, wenn der Folgeslot belegt ist', () => {
        const own = booking({ start: at(day, 8), end: at(day, 13) });
        const next = booking({ start: at(day, 13), end: at(day, 18), user: OTHER });
        const state = getSlotState(day, VORMITTAG, [own, next], USER, at(day, 7));
        expect(state.canExtend).toBe(false);
    });

    it('kann nicht verlängern, wenn die Nacht des Folgetags nicht mehr frei ist', () => {
        const own = booking({ start: at(day, 13), end: at(day, 18) });
        const night = booking({ start: at(day, 18), end: at(nextDay, 8), user: OTHER });
        const state = getSlotState(day, NACHMITTAG, [own, night], USER, at(day, 7));
        expect(state.canExtend).toBe(false);
    });

    it('läuft gerade, wenn jetzt im Fenster liegt', () => {
        const own = booking({ start: at(day, 8), end: at(day, 13) });
        const state = getSlotState(day, VORMITTAG, [own], USER, at(day, 10));
        expect(state.isRunning).toBe(true);
        expect(state.canExtend).toBe(true);
    });

    it('vergangene eigene Buchung kann nicht mehr verlängert werden', () => {
        const own = booking({ start: at(day, 8), end: at(day, 13) });
        const state = getSlotState(day, VORMITTAG, [own], USER, at(day, 14, 30));
        expect(state.kind).toBe('own');
        expect(state.isPast).toBe(true);
        expect(state.canExtend).toBe(false);
    });

    it('verkürzter Folgeslot (14–18) gehört dem Bucher und hat keine Verlängerung', () => {
        const own = booking({ start: at(day, 14), end: at(day, 18) });
        const state = getSlotState(day, NACHMITTAG, [own], USER, at(day, 7));
        expect(state.kind).toBe('own');
        expect(state.extensionHours).toBe(0);
    });
});

describe('getSlotState – fremde Buchung', () => {
    it('fremde Buchung im Slot ist foreign', () => {
        const other = booking({ start: at(day, 8), end: at(day, 13), user: OTHER });
        const state = getSlotState(day, VORMITTAG, [other], USER, at(day, 7));
        expect(state.kind).toBe('foreign');
        expect(state.booking?.id).toBe(other.id);
        expect(state.canExtend).toBe(false);
        expect(state.canShrink).toBe(false);
    });

    it('ohne eingeloggten User ist jede Buchung foreign', () => {
        const own = booking({ start: at(day, 8), end: at(day, 13) });
        const state = getSlotState(day, VORMITTAG, [own], null, at(day, 7));
        expect(state.kind).toBe('foreign');
    });
});

describe('slotForBooking', () => {
    it('ordnet nach Startstunde zu', () => {
        expect(slotForBooking(booking({ start: at(day, 9), end: at(day, 13) })).id).toBe(VORMITTAG.id);
        expect(slotForBooking(booking({ start: at(day, 14), end: at(day, 18) })).id).toBe(NACHMITTAG.id);
        expect(slotForBooking(booking({ start: at(day, 2), end: at(day, 8) })).id).toBe(NACHT.id);
        expect(slotForBooking(booking({ start: at(day, 18), end: at(nextDay, 8) })).id).toBe(NACHT.id);
    });
});

describe('findNextFreeSlot', () => {
    it('überspringt belegte und vergangene Slots', () => {
        const bookings = [
            booking({ start: at(day, 8), end: at(day, 13), user: OTHER }),
            booking({ start: at(day, 13), end: at(day, 18), user: OTHER }),
        ];
        const next = findNextFreeSlot(bookings, at(day, 9));
        expect(next?.slot.id).toBe(NACHT.id);
        expect(next?.start.getTime()).toBe(at(day, 18).getTime());
    });

    it('springt auf den Folgetag, wenn heute alles belegt ist', () => {
        const bookings = [
            booking({ start: at(day, 8), end: at(day, 13), user: OTHER }),
            booking({ start: at(day, 13), end: at(day, 18), user: OTHER }),
            booking({ start: at(day, 18), end: at(nextDay, 8), user: OTHER }),
        ];
        const next = findNextFreeSlot(bookings, at(day, 9));
        expect(next?.slot.id).toBe(VORMITTAG.id);
        expect(next?.start.getTime()).toBe(at(nextDay, 8).getTime());
    });

    it('liefert den laufenden Slot, wenn er noch frei ist', () => {
        const next = findNextFreeSlot([], at(day, 9));
        expect(next?.slot.id).toBe(VORMITTAG.id);
        expect(next?.date.getDate()).toBe(day.getDate());
    });
});

describe('slotStatesForDay', () => {
    it('liefert drei Zustände in Slot-Reihenfolge', () => {
        const states = slotStatesForDay(day, [], USER, at(day, 7));
        expect(states.map(s => s.slot.id)).toEqual(TIME_SLOTS.map(s => s.id));
    });
});
