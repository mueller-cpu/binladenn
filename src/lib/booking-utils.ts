import { addDays, format, isSameDay, setHours, setMinutes, startOfDay, isBefore, addHours } from "date-fns";

export type TimeSlot = {
    id: number;
    label: string;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    startHour: number;
    duration: number; // in hours
};

export const TIME_SLOTS: TimeSlot[] = [
    { id: 1, label: "Vormittag (08:00 - 12:00)", startTime: "08:00", endTime: "12:00", startHour: 8, duration: 4 },
    { id: 2, label: "Nachmittag (12:00 - 18:00)", startTime: "12:00", endTime: "18:00", startHour: 12, duration: 6 },
    { id: 3, label: "Nacht (18:00 - 08:00)", startTime: "18:00", endTime: "08:00", startHour: 18, duration: 14 },
];

export function getSlotDate(baseDate: Date, slot: TimeSlot): Date {
    const d = new Date(baseDate);
    d.setHours(slot.startHour, 0, 0, 0);
    return d;
}

export function isSlotInPast(baseDate: Date, slot: TimeSlot): boolean {
    const slotStart = getSlotDate(baseDate, slot);
    const slotEnd = addHours(slotStart, slot.duration);
    const now = new Date();

    // Allow booking until the slot ends.
    // If the slot end time is in the past, then the slot is in the past.
    return isBefore(slotEnd, now);
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
