import { describe, it, expect } from 'vitest';
import { TIME_SLOTS } from '@/lib/booking-utils';
import type { Booking } from '@/lib/types';
import {
    rangeStart,
    isCompleted,
    occupancyMatrix,
    overallOccupancy,
    slotDistribution,
    leaderboard,
    myStats,
    bestChances,
    extensionsPerSlot,
} from '@/lib/stats';

const [VORMITTAG, NACHMITTAG, NACHT] = TIME_SLOTS;
const USER = 'user-1';
const OTHER = 'user-2';

// Dienstag, 22. September 2026, 10:00 lokale Zeit
const NOW = new Date(2026, 8, 22, 10, 0, 0, 0);

function d(year: number, monthIndex: number, day: number, hours = 0, minutes = 0): Date {
    return new Date(year, monthIndex, day, hours, minutes, 0, 0);
}

let idCounter = 0;
function booking(opts: {
    start: Date;
    end: Date;
    user?: string;
    status?: Booking['status'];
    charging_status?: Booking['charging_status'];
    name?: [string, string];
}): Booking {
    idCounter += 1;
    const [first, last] = opts.name ?? (opts.user === OTHER ? ['Bea', 'Beispiel'] : ['Anna', 'Ampere']);
    return {
        id: `b-${idCounter}`,
        user_id: opts.user ?? USER,
        start_time: opts.start.toISOString(),
        end_time: opts.end.toISOString(),
        duration: (opts.end.getTime() - opts.start.getTime()) / 3_600_000,
        status: opts.status ?? 'active',
        charging_status: opts.charging_status ?? 'unknown',
        profiles: { first_name: first, last_name: last, avatar_url: null },
    };
}

describe('rangeStart', () => {
    it('4 Wochen = 28 Tage vor heute, auf Tagesbeginn gerundet', () => {
        expect(rangeStart('4w', NOW)?.getTime()).toBe(d(2026, 7, 25).getTime());
    });
    it('3 Monate = drei Monate vor heute, auf Tagesbeginn gerundet', () => {
        expect(rangeStart('3m', NOW)?.getTime()).toBe(d(2026, 5, 22).getTime());
    });
    it('Gesamt hat keinen Start', () => {
        expect(rangeStart('all', NOW)).toBeNull();
    });
});

describe('isCompleted', () => {
    it('aktiv und beendet ist abgeschlossen', () => {
        expect(isCompleted(booking({ start: d(2026, 8, 21, 8), end: d(2026, 8, 21, 13) }), NOW)).toBe(true);
    });
    it('laufend oder zukünftig ist nicht abgeschlossen', () => {
        expect(isCompleted(booking({ start: d(2026, 8, 22, 8), end: d(2026, 8, 22, 13) }), NOW)).toBe(false);
    });
    it('storniert ist nicht abgeschlossen', () => {
        expect(isCompleted(booking({ start: d(2026, 8, 21, 8), end: d(2026, 8, 21, 13), status: 'cancelled' }), NOW)).toBe(false);
    });
});

describe('occupancyMatrix', () => {
    it('Montag-Vormittag in beiden Wochen gebucht ergibt Quote 1, Rest 0', () => {
        const from = d(2026, 7, 31); // Montag
        const to = d(2026, 8, 14);   // Montag, zwei Wochen später
        const bookings = [
            booking({ start: d(2026, 7, 31, 8), end: d(2026, 7, 31, 13) }),
            booking({ start: d(2026, 8, 7, 8), end: d(2026, 8, 7, 13) }),
        ];
        const m = occupancyMatrix(bookings, from, to);
        expect(m).toHaveLength(7);
        expect(m[0]).toHaveLength(3);
        expect(m[0][0]).toBe(1);
        expect(m[0][1]).toBe(0);
        expect(m[1][0]).toBe(0);
    });

    it('ein verkürzter Folgeslot (ab 14:00) zählt als belegter Nachmittag', () => {
        const from = d(2026, 7, 31);
        const to = d(2026, 8, 7);
        const bookings = [booking({ start: d(2026, 7, 31, 14), end: d(2026, 7, 31, 18) })];
        expect(occupancyMatrix(bookings, from, to)[0][1]).toBe(1);
    });

    it('stornierte Buchungen belegen nichts', () => {
        const from = d(2026, 7, 31);
        const to = d(2026, 8, 7);
        const bookings = [booking({ start: d(2026, 7, 31, 8), end: d(2026, 7, 31, 13), status: 'cancelled' })];
        expect(occupancyMatrix(bookings, from, to)[0][0]).toBe(0);
    });
});

describe('overallOccupancy', () => {
    it('zwei Tage à drei Slots mit drei Buchungen sind halb belegt', () => {
        const from = d(2026, 7, 31);      // Montag 00:00
        const to = d(2026, 8, 2, 8);      // Mittwoch 08:00, damit die Nacht von Dienstag mitzählt
        const bookings = [
            booking({ start: d(2026, 7, 31, 8), end: d(2026, 7, 31, 13) }),
            booking({ start: d(2026, 7, 31, 18), end: d(2026, 8, 1, 8) }),
            booking({ start: d(2026, 8, 1, 13), end: d(2026, 8, 1, 18) }),
        ];
        const result = overallOccupancy(bookings, from, to);
        expect(result.total).toBe(6);
        expect(result.booked).toBe(3);
        expect(result.ratio).toBeCloseTo(0.5);
    });
});

describe('slotDistribution', () => {
    it('zählt abgeschlossene Buchungen je Slot, auch verschobene Starts', () => {
        const bookings = [
            booking({ start: d(2026, 8, 14, 8), end: d(2026, 8, 14, 13) }),
            booking({ start: d(2026, 8, 15, 8), end: d(2026, 8, 15, 13) }),
            booking({ start: d(2026, 8, 15, 14), end: d(2026, 8, 15, 18) }),
            booking({ start: d(2026, 8, 15, 18), end: d(2026, 8, 16, 8) }),
            booking({ start: d(2026, 8, 24, 8), end: d(2026, 8, 24, 13) }), // Zukunft
        ];
        expect(slotDistribution(bookings, NOW)).toEqual([2, 1, 1]);
    });
});

describe('leaderboard', () => {
    it('sortiert nach Ladungen, ignoriert gemeldete und summiert Stunden', () => {
        const bookings = [
            booking({ start: d(2026, 8, 14, 8), end: d(2026, 8, 14, 13), charging_status: 'charging' }),
            booking({ start: d(2026, 8, 15, 8), end: d(2026, 8, 15, 13) }),
            booking({ start: d(2026, 8, 16, 8), end: d(2026, 8, 16, 13), charging_status: 'not_charging' }),
            booking({ start: d(2026, 8, 14, 18), end: d(2026, 8, 15, 8), user: OTHER }),
        ];
        const board = leaderboard(bookings, NOW);
        expect(board).toHaveLength(2);
        expect(board[0]).toMatchObject({ userId: USER, firstName: 'Anna', count: 2, hours: 10 });
        expect(board[1]).toMatchObject({ userId: OTHER, firstName: 'Bea', count: 1, hours: 14 });
    });

    it('begrenzt auf limit', () => {
        const bookings = [
            booking({ start: d(2026, 8, 14, 8), end: d(2026, 8, 14, 13) }),
            booking({ start: d(2026, 8, 14, 18), end: d(2026, 8, 15, 8), user: OTHER }),
        ];
        expect(leaderboard(bookings, NOW, 1)).toHaveLength(1);
    });
});

describe('myStats', () => {
    const bookings = [
        booking({ start: d(2026, 8, 7, 8), end: d(2026, 8, 7, 13), charging_status: 'charging' }),   // Vorvorwoche
        booking({ start: d(2026, 8, 15, 8), end: d(2026, 8, 15, 14), charging_status: 'charging' }),  // Vorwoche, verlängert
        booking({ start: d(2026, 8, 16, 13), end: d(2026, 8, 16, 18) }),                            // Vorwoche
        booking({ start: d(2026, 8, 17, 8), end: d(2026, 8, 17, 13), charging_status: 'charging' }),  // Vorwoche
        booking({ start: d(2026, 8, 10, 8), end: d(2026, 8, 10, 13), status: 'cancelled' }),          // storniert
        booking({ start: d(2026, 8, 24, 8), end: d(2026, 8, 24, 13) }),                             // Zukunft
        booking({ start: d(2026, 8, 18, 8), end: d(2026, 8, 18, 13), user: OTHER }),                // fremd
    ];

    it('zählt Ladungen und Stunden dieses Monats', () => {
        const s = myStats(bookings, USER, NOW);
        expect(s.monthCount).toBe(4);
        expect(s.monthHours).toBe(21);
    });

    it('zählt alle abgeschlossenen, nicht gemeldeten Ladungen für die Punkte', () => {
        const reported = [...bookings, booking({ start: d(2026, 7, 3, 8), end: d(2026, 7, 3, 13), charging_status: 'not_charging' })];
        expect(myStats(reported, USER, NOW).totalCount).toBe(4);
    });

    it('findet den Lieblings-Slot', () => {
        expect(myStats(bookings, USER, NOW).favoriteSlot?.id).toBe(VORMITTAG.id);
    });

    it('zählt aufeinanderfolgende Wochen mit Ladung, beginnend bei der letzten Woche mit Ladung', () => {
        expect(myStats(bookings, USER, NOW).streakWeeks).toBe(2);
    });

    it('bricht die Serie bei einer Lücke ab', () => {
        const gap = bookings.filter(b => new Date(b.start_time).getDate() !== 7);
        expect(myStats(gap, USER, NOW).streakWeeks).toBe(1);
    });

    it('berechnet Storno-Quote und Anteil bestätigter Ladungen', () => {
        const s = myStats(bookings, USER, NOW);
        expect(s.cancelRate).toBeCloseTo(1 / 6);
        expect(s.confirmedRate).toBeCloseTo(3 / 4);
    });

    it('zählt Verlängerungen', () => {
        expect(myStats(bookings, USER, NOW).extensions).toBe(1);
    });

    it('liefert null-Quoten ohne Daten', () => {
        const s = myStats([], USER, NOW);
        expect(s.cancelRate).toBeNull();
        expect(s.confirmedRate).toBeNull();
        expect(s.favoriteSlot).toBeNull();
        expect(s.streakWeeks).toBe(0);
    });
});

describe('bestChances', () => {
    it('liefert die freien Slots dieser Woche mit der niedrigsten Quote zuerst', () => {
        const matrix = Array.from({ length: 7 }, () => [0.5, 0.5, 0.5]);
        matrix[1][1] = 0.9; // Di NM – hoch
        matrix[2][1] = 0.1; // Mi NM – sehr frei
        matrix[3][0] = 0.2; // Do VM
        matrix[4][2] = 0.3; // Fr N
        const future = [booking({ start: d(2026, 8, 23, 8), end: d(2026, 8, 23, 13), user: OTHER })]; // Mi VM belegt

        const chances = bestChances(matrix, future, NOW);
        expect(chances).toHaveLength(3);
        expect(chances[0]).toMatchObject({ slot: NACHMITTAG, ratio: 0.1 });
        expect(chances[0].date.getDate()).toBe(23);
        expect(chances[1]).toMatchObject({ slot: VORMITTAG, ratio: 0.2 });
        expect(chances[1].date.getDate()).toBe(24);
        expect(chances[2]).toMatchObject({ slot: NACHT, ratio: 0.3 });
        expect(chances[2].date.getDate()).toBe(25);
    });

    it('überspringt belegte und vergangene Slots', () => {
        const matrix = Array.from({ length: 7 }, () => [0.5, 0.5, 0.5]);
        matrix[0][0] = 0; // Mo VM – vergangen (NOW ist Dienstag)
        matrix[2][0] = 0; // Mi VM – belegt
        const future = [booking({ start: d(2026, 8, 23, 8), end: d(2026, 8, 23, 13), user: OTHER })];

        const chances = bestChances(matrix, future, NOW, 10);
        expect(chances.some(c => c.date.getDate() === 21)).toBe(false);
        expect(chances.some(c => c.date.getDate() === 23 && c.slot.id === VORMITTAG.id)).toBe(false);
    });
});

describe('extensionsPerSlot', () => {
    it('zählt Buchungen, die über das feste Slot-Ende hinausgehen', () => {
        const bookings = [
            booking({ start: d(2026, 8, 14, 8), end: d(2026, 8, 14, 14) }),
            booking({ start: d(2026, 8, 14, 13), end: d(2026, 8, 14, 18) }),
            booking({ start: d(2026, 8, 14, 18), end: d(2026, 8, 15, 9) }),
        ];
        expect(extensionsPerSlot(bookings)).toEqual([1, 0, 1]);
    });
});
