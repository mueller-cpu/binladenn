'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarClock, ChevronRight, Plug } from 'lucide-react';
import { formatDay, formatTimeRange } from '@/lib/booking-utils';
import type { Booking } from '@/lib/types';

interface NextChargeCardProps {
    booking: Booking | null;
    onOpen: (date: Date) => void;
}

export function NextChargeCard({ booking, onOpen }: NextChargeCardProps) {
    if (!booking) {
        return (
            <div className="glass flex items-center gap-4 rounded-xl p-4 sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04] text-muted-foreground">
                    <Plug size={20} strokeWidth={1.5} className="opacity-60" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Nächste Ladung</p>
                    <p className="text-sm font-medium">Keine Ladung geplant</p>
                    <p className="text-xs text-muted-foreground">Tipp auf einen freien Slot, um zu buchen.</p>
                </div>
            </div>
        );
    }

    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const running = start <= new Date() && new Date() < end;

    return (
        <button
            type="button"
            onClick={() => onOpen(start)}
            className="glass glass-hover flex w-full items-center gap-4 rounded-xl p-4 text-left sm:p-5"
        >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neon/10 text-neon shadow-[inset_0_0_0_1px_hsl(var(--neon)/0.15)]">
                <CalendarClock size={20} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    {running ? 'Läuft gerade' : 'Nächste Ladung'}
                </p>
                <p className="truncate text-base font-semibold tabular-nums">
                    {formatDay(start)}
                    <span className="mx-1.5 text-muted-foreground">·</span>
                    {formatTimeRange(start, end)}
                </p>
                <p className="text-xs text-muted-foreground">{format(start, 'd. MMMM yyyy', { locale: de })}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
        </button>
    );
}
