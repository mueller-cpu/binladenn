"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeSlot, isSlotInPast } from '@/lib/booking-utils';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { Booking } from '@/lib/types';

interface SlotCardProps {
    slot: TimeSlot;
    booking?: Booking;
    currentUser: User | null;
    date: Date;
    onClick: () => void;
}

export function SlotCard({ slot, booking, currentUser, date, onClick }: SlotCardProps) {
    const isOwn = booking?.user_id === currentUser?.id;
    const isPast = isSlotInPast(date, slot);
    const isFree = !booking;

    let statusColor = "bg-card";
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
            className={cn("transition-all border-2", statusColor, statusBorder)}
            onClick={onClick}
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
}
