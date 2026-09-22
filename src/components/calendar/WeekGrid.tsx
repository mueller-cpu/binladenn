'use client';

import { Fragment } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { TIME_SLOTS, TimeSlot } from '@/lib/booking-utils';
import { getSlotState, SlotState } from '@/lib/slot-state';
import type { Booking } from '@/lib/types';

interface WeekGridProps {
    weekStart: Date;
    bookings: Booking[];
    userId: string | null;
    now: Date;
    onBook: (date: Date, slot: TimeSlot) => void;
    onOpenDay: (date: Date) => void;
}

export function WeekGrid({ weekStart, bookings, userId, now, onBook, onOpenDay }: WeekGridProps) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className="glass rounded-xl p-3 sm:p-5">
            <div className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] gap-1.5 sm:grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] sm:gap-2">
                <div />
                {days.map(day => {
                    const today = isSameDay(day, now);
                    return (
                        <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => onOpenDay(day)}
                            className={cn(
                                'flex flex-col items-center rounded-lg py-1 transition-colors duration-200 hover:bg-foreground/[0.04]',
                                today ? 'text-neon' : 'text-foreground'
                            )}
                        >
                            <span className="text-[10px] uppercase tracking-widest opacity-70">
                                {format(day, 'EEEEEE', { locale: de })}
                            </span>
                            <span className="text-sm font-semibold tabular-nums">{format(day, 'd')}</span>
                            <span className={cn('mt-0.5 h-0.5 w-4 rounded-full', today ? 'bg-neon' : 'bg-transparent')} />
                        </button>
                    );
                })}

                {TIME_SLOTS.map(slot => (
                    <Fragment key={slot.id}>
                        <div
                            title={`${slot.label} ${slot.startTime}–${slot.endTime}`}
                            className="flex items-center justify-end pr-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                        >
                            {slot.shortLabel}
                        </div>
                        {days.map(day => (
                            <WeekCell
                                key={`${day.toISOString()}-${slot.id}`}
                                state={getSlotState(day, slot, bookings, userId, now)}
                                onBook={() => onBook(day, slot)}
                                onOpenDay={() => onOpenDay(day)}
                            />
                        ))}
                    </Fragment>
                ))}
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                VM 08–13 · NM 13–18 · N 18–08
            </p>
        </div>
    );
}

function WeekCell({ state, onBook, onOpenDay }: { state: SlotState; onBook: () => void; onOpenDay: () => void }) {
    const { kind, isPast, booking, availableFrom, start } = state;
    const base = 'flex h-11 w-full items-center justify-center rounded-lg text-xs transition-all duration-200';

    if (kind === 'free') {
        if (isPast) {
            return <div aria-hidden className={cn(base, 'border border-foreground/[0.05] bg-foreground/[0.02]')} />;
        }
        const shifted = availableFrom.getTime() !== start.getTime();
        return (
            <button
                type="button"
                aria-label={`${state.slot.label} frei, antippen zum Buchen`}
                onClick={onBook}
                className={cn(base, 'flex-col gap-0.5 border border-dashed border-neon/40 text-neon/80 hover:bg-neon/10 hover:text-neon active:scale-95')}
            >
                <Plus size={14} strokeWidth={2} />
                {shifted && <span className="text-[9px] leading-none">ab {format(availableFrom, 'HH')}</span>}
            </button>
        );
    }

    if (kind === 'own') {
        return (
            <button
                type="button"
                aria-label={`${state.slot.label}, deine Buchung`}
                onClick={onOpenDay}
                className={cn(base, 'bg-primary font-semibold text-primary-foreground shadow-neon', isPast && 'opacity-50 shadow-none')}
            >
                Du
            </button>
        );
    }

    const profile = booking?.profiles;
    const reported = booking?.charging_status === 'not_charging';
    const charging = booking?.charging_status === 'charging';
    return (
        <button
            type="button"
            aria-label={`${state.slot.label}, gebucht von ${profile?.first_name ?? 'jemand'}`}
            onClick={onOpenDay}
            className={cn(
                base,
                'relative border border-foreground/[0.06] bg-foreground/[0.05] hover:bg-foreground/[0.09]',
                reported && 'ring-1 ring-destructive/60',
                isPast && 'opacity-50'
            )}
        >
            <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-transparent text-[10px] font-semibold text-muted-foreground">
                    {`${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
                </AvatarFallback>
            </Avatar>
            {charging && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Zap size={8} strokeWidth={3} />
                </span>
            )}
        </button>
    );
}
