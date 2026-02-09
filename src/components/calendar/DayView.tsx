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
    profiles?: {
        first_name: string;
        last_name: string;
    };
};

interface DayViewProps {
    date: Date;
    bookings: Booking[];
    currentUser: User | null;
    onBook: (slot: TimeSlot, duration: 4 | 8, notes: string) => Promise<void>;
    onCancel: (bookingId: string) => Promise<void>;
}

export function DayView({ date, bookings, currentUser, onBook, onCancel }: DayViewProps) {
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const getBookingForSlot = (slot: TimeSlot) => {
        // Simple check: does any booking overlap with this slot?
        // In strict 4h blocks, start time match is enough usually.
        return bookings.find(b => {
            const bookingStart = new Date(b.start_time);
            return bookingStart.getHours() === slot.startHour && b.status === 'active';
        });
    };

    const isSlotOccupied = (slot: TimeSlot) => {
        // Also check 8h bookings starting in previous slot
        const directWait = getBookingForSlot(slot);
        if (directWait) return directWait;

        // Check previous slot for 8h booking
        const prevSlot = TIME_SLOTS.find(s => s.startHour === slot.startHour - 4);
        if (prevSlot) {
            const prevBooking = getBookingForSlot(prevSlot);
            if (prevBooking && prevBooking.duration === 8) {
                return prevBooking;
            }
        }
        return null;
    };

    const handleSlotClick = (slot: TimeSlot) => {
        if (!currentUser) {
            toast.error("Bitte einloggen zum Buchen");
            return;
        }

        if (isSlotInPast(date, slot)) {
            toast.error("Dieser Slot liegt in der Vergangenheit");
            return;
        }

        const booking = isSlotOccupied(slot);
        if (booking) {
            if (booking.user_id === currentUser.id) {
                // Own booking: Show details / cancel option?
                // For MVP: Simple cancel toast or dialog?
                // Let's just show a toast for now or implement a EditDialog later.
                if (confirm("Möchtest du diese Buchung stornieren?")) { // Native confirm for speed in MVP
                    onCancel(booking.id);
                }
            } else {
                toast.info(`Gebucht von ${booking.profiles?.first_name} ${booking.profiles?.last_name}`);
            }
            return;
        }

        setSelectedSlot(slot);
        setIsDialogOpen(true);
    };

    const handleBookingConfirm = async (duration: 4 | 8, notes: string) => {
        if (!selectedSlot) return;
        setIsProcessing(true);
        try {
            await onBook(selectedSlot, duration, notes);
            toast.success("Buchung erfolgreich!");
        } catch (e) {
            console.error("Booking error caught in view:", JSON.stringify(e, null, 2));
            toast.error("Fehler beim Buchen. Details in der Konsole.");
            throw e; // Re-throw to keep dialog open if needed, but handled in Dialog
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
                        statusColor = "bg-green-50/50 hover:bg-green-100/50 dark:bg-green-950/20 dark:hover:bg-green-950/40 cursor-pointer";
                        statusBorder = "border-green-200 dark:border-green-800";
                    } else if (isOwn) {
                        statusColor = "bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 cursor-pointer";
                        statusBorder = "border-blue-300 dark:border-blue-700";
                    } else {
                        statusColor = "bg-red-50/50 dark:bg-red-950/20";
                        statusBorder = "border-red-200 dark:border-red-800";
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
