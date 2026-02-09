import { addDays, format, isSameDay, setHours, setMinutes, startOfDay, isBefore, addHours } from "date-fns";

export type TimeSlot = {
    id: number;
    label: string;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    startHour: number;
};

export const TIME_SLOTS: TimeSlot[] = [
    { id: 1, label: "00:00 - 04:00", startTime: "00:00", endTime: "04:00", startHour: 0 },
    { id: 2, label: "04:00 - 08:00", startTime: "04:00", endTime: "08:00", startHour: 4 },
    { id: 3, label: "08:00 - 12:00", startTime: "08:00", endTime: "12:00", startHour: 8 },
    { id: 4, label: "12:00 - 16:00", startTime: "12:00", endTime: "16:00", startHour: 12 },
    { id: 5, label: "16:00 - 20:00", startTime: "16:00", endTime: "20:00", startHour: 16 },
    { id: 6, label: "20:00 - 00:00", startTime: "20:00", endTime: "00:00", startHour: 20 },
];

export function getSlotDate(baseDate: Date, slot: TimeSlot): Date {
    const d = new Date(baseDate);
    d.setHours(slot.startHour, 0, 0, 0);
    return d;
}

export function isSlotInPast(baseDate: Date, slot: TimeSlot): boolean {
    const slotStart = getSlotDate(baseDate, slot);
    const now = new Date();
    // Allow booking if slot started less than 1 hour ago? No, strict check for now.
    // Actually spec says "Nicht in der Vergangenheit".
    // If it's 09:00, can I book 08:00-12:00? Probably yes ideally, but let's be strict for now: if start time is past, it's past.
    // Spec says "Late-Cancellation allowed", maybe late booking too?
    // Let's use current time.
    return isBefore(slotStart, now) && !isSameHour(slotStart, now);
}

function isSameHour(d1: Date, d2: Date) {
    return d1.getHours() === d2.getHours() && isSameDay(d1, d2);
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
    return format(date, "EE, d. MMM"); // Mo, 10. Feb
}
