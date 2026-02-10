'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeSlot, TIME_SLOTS, isSlotInPast } from '@/lib/booking-utils';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { BookingDialog } from '../booking/BookingDialog';
import { toast } from 'sonner';

// Define booking type locally for now, moving to types later
type Booking = {
    id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    duration: number;
    status: 'active' | 'cancelled';
    charging_status?: 'charging' | 'not_charging' | 'unknown';
    reporter_id?: string;
    profiles?: {
        first_name: string;
        last_name: string;
    };
};

interface DayViewProps {
    date: Date;
    bookings: Booking[];
    currentUser: User | null;
    onBook: (slot: TimeSlot, duration: number, notes: string) => Promise<void>;
    onCancel: (bookingId: string) => Promise<void>;
    onReport: (bookingId: string) => Promise<void>;
    onUndoReport: (bookingId: string) => Promise<void>; // New prop
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
            // Overlap if booking starts before slot ends AND booking ends after slot starts
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
                // Own booking options
                if (confirm("Möchtest du diese Buchung verwalten?")) {
                    const action = prompt("Tippe 'storno' zum Stornieren oder 'laden' zum Bestätigen des Ladens:");
                    if (action === 'storno') {
                        onCancel(booking.id);
                    } else if (action === 'laden') {
                        onConfirmCharging(booking.id);
                    }
                }
            } else {
                // Other booking options
                // Check if I am the reporter
                // Note: reporter_id is optional in Booking type, so we check existence
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
            // Pass duration from slot
            await onBook(selectedSlot, selectedSlot.duration as 4 | 8, notes);
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
                {TIME_SLOTS.map((slot) => {
                    const booking = isSlotOccupied(slot);
                    const isOwn = booking?.user_id === currentUser?.id;
                    const isPast = isSlotInPast(date, slot);
                    const isFree = !booking;

                    let statusColor = "bg-card"; // Default
                    let statusBorder = "border-border";

                    if (isFree) {
                        statusColor = "bg-green-50/50 hover:bg-green-100/50 dark:bg-[hsl(var(--neon-green)/0.15)] dark:hover:bg-[hsl(var(--neon-green)/0.25)] cursor-pointer";
                        statusBorder = "border-green-200 dark:border-[hsl(var(--neon-green)/0.5)]";
                    } else if (isOwn) {
                        statusColor = "bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 cursor-pointer";
                        statusBorder = "border-blue-300 dark:border-blue-700";
                    } else {
                        // Check charging status for others
                        if (booking.charging_status === 'not_charging') {
                            statusColor = "bg-red-200 dark:bg-red-900/80"; // Reported!
                            statusBorder = "border-red-500";
                        } else if (booking.charging_status === 'charging') {
                            statusColor = "bg-green-100 dark:bg-green-900/40"; // Good citizen
                            statusBorder = "border-green-500";
                        } else {
                            statusColor = "bg-red-50/50 dark:bg-red-950/20";
                            statusBorder = "border-red-200 dark:border-red-800";
                        }
                    }

                    if (isPast && isFree) {
                        statusColor = "bg-muted/50";
                        statusBorder = "border-muted";
                    }

                    return (
                        <Card
                            key={slot.id}
                            className={cn("transition-all border-2", statusColor, statusBorder)}
                            onClick={() => handleSlotClick(slot)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {slot.label}
                                </CardTitle>
                                {booking && isOwn && <span className="text-xs font-bold text-blue-600">DEINE BUCHUNG</span>}
                                {booking && booking.charging_status === 'charging' && <span className="text-xs font-bold text-green-600">LÄDT</span>}
                                {booking && booking.charging_status === 'not_charging' && <span className="text-xs font-bold text-red-600">STOPP!</span>}
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {isFree ? (isPast ? "Vergangen" : "Frei") : (isOwn ? "Gebucht" : "Belegt")}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {booking ?
                                        `Gebucht von ${booking.profiles?.first_name || 'Unbekannt'} ${booking.profiles?.last_name || ''}` :
                                        (isPast ? "Nicht mehr buchbar" : "Tippen zum Buchen")
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
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
