"use client";

import { useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { TimeSlot, TIME_SLOTS, isSlotInPast } from '@/lib/booking-utils';
import { Booking } from '@/lib/types';
import { User } from '@supabase/supabase-js';
import { SlotCard } from './SlotCard';
import { BookingDialog } from '../booking/BookingDialog';
import { toast } from 'sonner';

interface WeekViewProps {
    startDate: Date;
    bookings: Booking[];
    currentUser: User | null;
    onBook: (slot: TimeSlot, duration: number, notes: string, date: Date) => Promise<void>;
    onCancel: (bookingId: string) => Promise<void>;
    onReport: (bookingId: string) => Promise<void>;
    onUndoReport: (bookingId: string) => Promise<void>;
    onConfirmCharging: (bookingId: string) => Promise<void>;
}

// We need a wrapper for onBook to include the date because SlotCard slot doesn't have date
// Actually SlotCard takes `date` prop.
// But `onBook` in DayView just takes slot. DayView has `date` in scope.
// In WeekView, we have multiple days. When clicking a slot, we need to know WHICH date it is.

export function WeekView({ startDate, bookings, currentUser, onBook, onCancel, onReport, onUndoReport, onConfirmCharging }: WeekViewProps) {
    const [selectedSlotData, setSelectedSlotData] = useState<{ slot: TimeSlot, date: Date } | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Generate 7 days
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    const isSlotOccupied = (date: Date, slot: TimeSlot) => {
        const slotStart = new Date(date);
        slotStart.setHours(slot.startHour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(slotStart.getHours() + slot.duration);

        return bookings.find(b => {
            if (b.status !== 'active') return false;
            const bStart = new Date(b.start_time);
            const bEnd = new Date(b.end_time);
            return bStart < slotEnd && bEnd > slotStart;
        });
    };

    const handleSlotClick = (date: Date, slot: TimeSlot) => {
        if (!currentUser) {
            toast.error("Bitte einloggen zum Buchen");
            return;
        }

        const booking = isSlotOccupied(date, slot);

        // Copy-paste logic from DayView basically, but adapted for date context
        // Ideally this logic should be a helper too, but let's duplicate for MVP speed as planned
        if (booking) {
            if (booking.user_id === currentUser.id) {
                if (confirm("Möchtest du diese Buchung verwalten?")) {
                    const action = prompt("Tippe 'storno' zum Stornieren oder 'laden' zum Bestätigen des Ladens:");
                    if (action === 'storno') {
                        onCancel(booking.id);
                    } else if (action === 'laden') {
                        onConfirmCharging(booking.id);
                    }
                }
            } else {
                const isReporter = booking.reporter_id === currentUser.id;
                if (booking.charging_status === 'not_charging' && isReporter) {
                    if (confirm("Du hast diesen Nutzer gemeldet. Meldung ZURÜCKZIEHEN?")) onUndoReport(booking.id);
                } else if (booking.charging_status !== 'charging' && booking.charging_status !== 'not_charging') {
                    if (confirm(`Gebucht von ${booking.profiles?.first_name}. Lädt NICHT? Melden?`)) onReport(booking.id);
                } else if (booking.charging_status === 'charging') {
                    toast.success("Fahrzeug lädt bestätigt.");
                } else if (booking.charging_status === 'not_charging') {
                    toast.error("Fahrzeug wurde als 'Lädt nicht' gemeldet.");
                }
            }
            return;
        }

        if (isSlotInPast(date, slot)) {
            toast.error("Vergangenheit");
            return;
        }

        setSelectedSlotData({ slot, date });
        setIsDialogOpen(true);
    };

    // Wrapper to inject the correct date into the onBook call
    // Wait, onBook signature in Page.tsx uses `currentDate` state. 
    // We need to change Page.tsx `handleBook` to accept a date OR update the signature passed to WeekView.
    // Actually, `DayView` uses `currentDate` from props.
    // `page.tsx` `handleBook` uses `currentDate` state.
    // This is a problem for WeekView because the date changes per column.
    // -> I MUST update `handleBook` in `page.tsx` to accept an optional date override, or just a date argument.

    // Changing `onBook` prop to: (slot: TimeSlot, duration: number, notes: string, dateOverride?: Date) => ...

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {weekDays.map((day) => (
                    <div key={day.toISOString()} className="flex flex-col gap-2 min-w-[200px] md:min-w-0">
                        <div className="text-center p-2 bg-muted rounded-lg font-bold">
                            {format(day, 'EEE dd.MM.', { locale: de })}
                        </div>
                        <div className="flex flex-col gap-2">
                            {TIME_SLOTS.map(slot => (
                                <SlotCard
                                    key={`${day.toISOString()}-${slot.id}`}
                                    slot={slot}
                                    booking={isSlotOccupied(day, slot)}
                                    currentUser={currentUser}
                                    date={day}
                                    onClick={() => handleSlotClick(day, slot)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <BookingDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                selectedDate={selectedSlotData?.date ?? new Date()}
                selectedSlot={selectedSlotData?.slot ?? null}
                onConfirm={async (duration, notes) => {
                    if (!selectedSlotData) return;
                    setIsProcessing(true);
                    try {
                        // Assuming I update the onBook signature in parent
                        // I will pass the date as the 4th argument or similar
                        // For now, I'll assume I can pass it. 
                        // I will define the prop type on WeekView to include date.
                        // But `onBook` is defined in Props above.
                        // I will need to cast or update the type in Props.
                        // Let's rely on the parent update.
                        // Wait, I can't call onBook with 4 args if it expects 3.
                        // I will update the interface WeekViewProps `onBook` to take `date`.
                        await onBook(selectedSlotData.slot, duration, notes, selectedSlotData.date);
                        toast.success("Gebucht!");
                    } catch (e) {
                        toast.error("Fehler!");
                    } finally {
                        setIsProcessing(false);
                    }
                }}
                isProcessing={isProcessing}
            />
        </>
    );
}

