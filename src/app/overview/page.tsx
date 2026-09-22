'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, startOfWeek } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarHeader, ViewMode } from '@/components/calendar/CalendarHeader';
import { DayTimeline } from '@/components/calendar/DayTimeline';
import { WeekGrid } from '@/components/calendar/WeekGrid';
import { NextChargeCard } from '@/components/calendar/NextChargeCard';
import { ReportDialog } from '@/components/calendar/ReportDialog';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useBookings } from '@/hooks/useBookings';
import { useSwipe } from '@/hooks/useSwipe';
import type { Booking } from '@/lib/types';

const CLOCK_TICK_MS = 60_000;

export default function OverviewPage() {
    const { user, isLoading: authLoading } = useRequireAuth();
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [date, setDate] = useState(() => new Date());
    const [now, setNow] = useState(() => new Date());
    const [reportTarget, setReportTarget] = useState<Booking | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
        return () => clearInterval(timer);
    }, []);

    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekStartMs = weekStart.getTime();
    // Breites Fenster, damit Tages- und Wochennavigation ohne Nachladen auskommt.
    const range = useMemo(
        () => ({ from: addDays(new Date(weekStartMs), -7), to: addDays(new Date(weekStartMs), 21) }),
        [weekStartMs]
    );

    const { bookings, loading, myProfile, book, cancel, extend, confirmCharging, report, undoReport } =
        useBookings(range, user);
    const actions = { book, cancel, extend, confirmCharging, report, undoReport };

    const step = viewMode === 'week' ? 7 : 1;
    const swipe = useSwipe(
        () => setDate(d => addDays(d, step)),
        () => setDate(d => addDays(d, -step))
    );

    const nextBooking = useMemo(() => {
        if (!user) return null;
        return bookings
            .filter(b => b.user_id === user.id && b.status === 'active' && new Date(b.end_time) > now)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))[0] ?? null;
    }, [bookings, user, now]);

    const openDay = (d: Date) => {
        setDate(d);
        setViewMode('day');
    };

    const showSkeleton = authLoading || (loading && bookings.length === 0);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-display text-2xl uppercase tracking-wider">Ladekalender</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {myProfile?.first_name ? `Hallo ${myProfile.first_name}. ` : ''}
                    Ein Tipp bucht, ein zweiter löscht.
                </p>
            </header>

            {showSkeleton ? (
                <Skeleton className="h-[84px] rounded-xl" />
            ) : (
                <NextChargeCard booking={nextBooking} onOpen={openDay} />
            )}

            <section className="space-y-4">
                <CalendarHeader
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    date={date}
                    onPrev={() => setDate(d => addDays(d, -step))}
                    onNext={() => setDate(d => addDays(d, step))}
                    onToday={() => setDate(new Date())}
                />

                <div {...swipe} className="touch-pan-y">
                    {showSkeleton ? (
                        <CalendarSkeleton viewMode={viewMode} />
                    ) : viewMode === 'day' ? (
                        <DayTimeline
                            date={date}
                            bookings={bookings}
                            userId={user?.id ?? null}
                            now={now}
                            actions={actions}
                            onReportRequest={setReportTarget}
                        />
                    ) : (
                        <WeekGrid
                            weekStart={weekStart}
                            bookings={bookings}
                            userId={user?.id ?? null}
                            now={now}
                            onBook={book}
                            onOpenDay={openDay}
                        />
                    )}
                </div>
            </section>

            <ReportDialog
                booking={reportTarget}
                open={reportTarget !== null}
                onOpenChange={open => { if (!open) setReportTarget(null); }}
                onConfirm={b => { setReportTarget(null); report(b); }}
            />
        </div>
    );
}

function CalendarSkeleton({ viewMode }: { viewMode: ViewMode }) {
    if (viewMode === 'week') {
        return <Skeleton className="h-[220px] rounded-xl" />;
    }
    return (
        <div className="space-y-3">
            {[0, 1, 2].map(i => (
                <div key={i} className="grid grid-cols-[3rem_1fr] gap-3 sm:grid-cols-[4rem_1fr] sm:gap-4">
                    <div className="space-y-2 py-1">
                        <Skeleton className="ml-auto h-4 w-10" />
                        <Skeleton className="ml-auto h-3 w-8" />
                    </div>
                    <Skeleton className="h-[104px] rounded-xl" />
                </div>
            ))}
        </div>
    );
}
