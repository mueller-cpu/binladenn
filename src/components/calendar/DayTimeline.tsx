'use client';

import { slotStatesForDay } from '@/lib/slot-state';
import type { Booking } from '@/lib/types';
import type { BookingActions } from '@/hooks/useBookings';
import { SlotCard } from './SlotCard';

interface DayTimelineProps {
    date: Date;
    bookings: Booking[];
    userId: string | null;
    now: Date;
    actions: BookingActions;
    onReportRequest: (booking: Booking) => void;
}

export function DayTimeline({ date, bookings, userId, now, actions, onReportRequest }: DayTimelineProps) {
    const states = slotStatesForDay(date, bookings, userId, now);

    return (
        <div className="space-y-3">
            {states.map(state => {
                const slotRunning = state.start <= now && now < state.end;
                const progress = slotRunning
                    ? (now.getTime() - state.start.getTime()) / (state.end.getTime() - state.start.getTime())
                    : null;

                return (
                    <div key={state.slot.id} className="grid grid-cols-[3rem_1fr] gap-3 sm:grid-cols-[4rem_1fr] sm:gap-4">
                        <div className="flex flex-col justify-between py-1 text-right">
                            <span className="text-sm font-semibold tabular-nums">{state.slot.startTime}</span>
                            <span className="text-xs tabular-nums text-muted-foreground">{state.slot.endTime}</span>
                        </div>
                        <div className="relative">
                            <SlotCard
                                state={state}
                                currentUserId={userId}
                                actions={actions}
                                onReportRequest={onReportRequest}
                            />
                            {progress !== null && <NowLine progress={progress} />}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/** Dünne Neon-Linie im laufenden Slot, proportional zur verstrichenen Zeit. */
function NowLine({ progress }: { progress: number }) {
    const top = `${Math.min(97, Math.max(3, progress * 100))}%`;
    return (
        <div aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top }}>
            <div className="relative h-px bg-neon shadow-neon">
                <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-neon animate-now-pulse" />
                <span className="absolute right-3 -top-2.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                    Jetzt
                </span>
            </div>
        </div>
    );
}
