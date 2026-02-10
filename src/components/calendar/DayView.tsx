'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeSlot, TIME_SLOTS, isSlotInPast } from '@/lib/booking-utils';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { BookingDialog } from '../booking/BookingDialog';
import { toast } from 'sonner';

import { Booking } from '@/lib/types';
import { SlotCard } from './SlotCard';

// Removed local Booking type definition

interface DayViewProps {
    date: Date;
    bookings: Booking[];
    currentUser: User | null;
    onBook: (slot: TimeSlot, duration: number, notes: string) => Promise<void>;
    onCancel: (bookingId: string) => Promise<void>;
    onReport: (bookingId: string) => Promise<void>;
    onUndoReport: (bookingId: string) => Promise<void>;
    onConfirmCharging: (bookingId: string) => Promise<void>;
}

export function DayView({ date, bookings, currentUser, onBook, onCancel, onReport, onUndoReport, onConfirmCharging }: DayViewProps) {
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const isSlotOccupied = (slot: TimeSlot) => {
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

    const handleSlotClick = (slot: TimeSlot) => {
        if (!currentUser) {
            toast.error("Bitte einloggen zum Buchen");
            return;
        }

        const booking = isSlotOccupied(slot);
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
                    if (confirm("Du hast diesen Nutzer gemeldet. Meldung ZURÜCKZIEHEN? Die Sperre wird aufgehoben.")) {
                        onUndoReport(booking.id);
                    }
                } else if (booking.charging_status !== 'charging' && booking.charging_status !== 'not_charging') {
                    if (confirm(`Gebucht von ${booking.profiles?.first_name}. Lädt dieses Fahrzeug NICHT? Melden?`)) {
                        onReport(booking.id);
                    }
                } else if (booking.charging_status === 'charging') {
                    toast.success("Fahrzeug lädt bestätigt.");
                } else if (booking.charging_status === 'not_charging') {
                    toast.error("Fahrzeug wurde als 'Lädt nicht' gemeldet.");
                }
            }
            return;
        }

        if (isSlotInPast(date, slot)) {
            toast.error("Dieser Slot liegt in der Vergangenheit");
            return;
        }

        setSelectedSlot(slot);
        setIsDialogOpen(true);
    };

    const handleBookingConfirm = async (duration: number, notes: string) => {
        if (!selectedSlot) return;
        setIsProcessing(true);
        try {
            await onBook(selectedSlot, selectedSlot.duration as 4 | 8, notes); // Duration ignored, taken from slot
            toast.success("Buchung erfolgreich!");
        } catch (e) {
            console.error("Booking error caught in view:", JSON.stringify(e, null, 2));
            toast.error("Fehler beim Buchen. Details in der Konsole.");
            throw e;
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {TIME_SLOTS.map((slot) => (
                    <SlotCard
                        key={slot.id}
                        slot={slot}
                        booking={isSlotOccupied(slot)}
                        currentUser={currentUser}
                        date={date}
                        onClick={() => handleSlotClick(slot)}
                    />
                ))}
            </div>

            <BookingDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                selectedDate={date}
                selectedSlot={selectedSlot}
                onConfirm={handleBookingConfirm}
                isProcessing={isProcessing}
            />
        </>
    );
}
