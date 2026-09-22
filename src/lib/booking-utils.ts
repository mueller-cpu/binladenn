import { addDays, format, isSameDay, isBefore } from "date-fns";
import { de } from "date-fns/locale";

export type TimeSlot = {
    id: number;
    label: string;
    shortLabel: string;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    startHour: number;
    duration: number; // in hours
};

export const TIME_SLOTS: TimeSlot[] = [
    { id: 1, label: "Vormittag", shortLabel: "VM", startTime: "08:00", endTime: "13:00", startHour: 8, duration: 5 },
    { id: 2, label: "Nachmittag", shortLabel: "NM", startTime: "13:00", endTime: "18:00", startHour: 13, duration: 5 },
    { id: 3, label: "Nacht", shortLabel: "N", startTime: "18:00", endTime: "08:00", startHour: 18, duration: 14 },
];

/** Addiert Stunden in Wanduhrzeit (bleibt bei Zeitumstellung auf der vollen Stunde). */
export function plusHours(date: Date, hours: number): Date {
    const d = new Date(date);
    d.setHours(d.getHours() + hours, d.getMinutes(), 0, 0);
    return d;
}

export function getSlotDate(baseDate: Date, slot: TimeSlot): Date {
    const d = new Date(baseDate);
    d.setHours(slot.startHour, 0, 0, 0);
    return d;
}

export function getSlotWindow(baseDate: Date, slot: TimeSlot): { start: Date; end: Date } {
    const start = getSlotDate(baseDate, slot);
    const end = plusHours(start, slot.duration);
    return { start, end };
}

export function hoursBetween(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / 3_600_000);
}

export function isSlotInPast(baseDate: Date, slot: TimeSlot): boolean {
    const { end } = getSlotWindow(baseDate, slot);
    return isBefore(end, new Date());
}

export function getNextDays(count: number = 7): Date[] {
    const today = new Date();
    const days = [];
    for (let i = 0; i < count; i++) {
        days.push(addDays(today, i));
    }
    return days;
}

export function formatDay(date: Date): string {
    if (isSameDay(date, new Date())) return "Heute";
    if (isSameDay(date, addDays(new Date(), 1))) return "Morgen";
    return format(date, "EE, d. MMM", { locale: de });
}

export function formatTimeRange(start: Date, end: Date): string {
    return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}
