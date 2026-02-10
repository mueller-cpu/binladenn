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

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { calculateLevel } from '@/lib/gamification';

export function SlotCard({ slot, booking, currentUser, date, onClick }: SlotCardProps) {
    const isOwn = booking?.user_id === currentUser?.id;
    const isPast = isSlotInPast(date, slot);
    const isFree = !booking;

    // Calculate level if booking exists
    const level = booking?.profiles?.booking_count !== undefined
        ? calculateLevel(booking.profiles.booking_count * 10)
        : null;

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
            className={cn("transition-all border-2 relative overflow-hidden", statusColor, statusBorder)}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {slot.label}
                </CardTitle>
                <div className="flex gap-2">
                    {booking && isOwn && <span className="text-xs font-bold text-blue-600">DEINE BUCHUNG</span>}
                    {booking && booking.charging_status === 'charging' && <span className="text-xs font-bold text-green-600">LÄDT</span>}
                    {booking && booking.charging_status === 'not_charging' && <span className="text-xs font-bold text-red-600">STOPP!</span>}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-2xl font-bold">
                            {isFree ? (isPast ? "Vergangen" : "Frei") : (isOwn ? "Gebucht" : "Belegt")}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {booking ?
                                `Gebucht von ${booking.profiles?.first_name || 'Unbekannt'} ${booking.profiles?.last_name || ''}` :
                                (isPast ? "Nicht mehr buchbar" : "Tippen zum Buchen")
                            }
                        </p>
                    </div>
                    {booking && booking.profiles?.avatar_url && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none scale-150">
                            {/* Creative Background Avatar Effect or just normal one? User said "rechten bereich". Let's do a clear one. */}
                        </div>
                    )}
                    {booking && (
                        <div className="flex flex-col items-center ml-2">
                            <div className="relative">
                                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                    <AvatarImage src={booking.profiles?.avatar_url || ''} />
                                    <AvatarFallback className="bg-muted text-muted-foreground">
                                        {booking.profiles?.first_name?.[0]}{booking.profiles?.last_name?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                {level && (
                                    <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-full shadow-sm border border-background">
                                        <level.icon className="h-3 w-3" />
                                    </div>
                                )}
                            </div>
                            {level && (
                                <span className="text-[10px] font-medium text-muted-foreground mt-1 text-center leading-tight max-w-[80px] break-words">
                                    {level.title}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
