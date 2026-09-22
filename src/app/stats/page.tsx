'use client';

import { useEffect, useMemo, useState } from 'react';
import { endOfWeek, startOfDay } from 'date-fns';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { BOOKING_PROFILE_SELECT } from '@/hooks/useBookings';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/types';
import { findNextFreeSlot } from '@/lib/slot-state';
import {
    StatsRange,
    Occupancy,
    rangeStart,
    occupancyMatrix,
    overallOccupancy,
    slotDistribution,
    leaderboard,
    myStats,
    bestChances,
    extensionsPerSlot,
} from '@/lib/stats';
import { RangeToggle, RANGE_LABEL } from '@/components/stats/RangeToggle';
import { BestChanceCard } from '@/components/stats/BestChanceCard';
import { OccupancyTile } from '@/components/stats/OccupancyTile';
import { Heatmap } from '@/components/stats/Heatmap';
import { SlotBars } from '@/components/stats/SlotBars';
import { Leaderboard } from '@/components/stats/Leaderboard';
import { MyStatsCard } from '@/components/stats/MyStatsCard';

const SELECT = `*, ${BOOKING_PROFILE_SELECT}`;

interface StatsData {
    history: Booking[];
    future: Booking[];
    mine: Booking[];
    now: Date;
}

export default function StatsPage() {
    const { user, isLoading: authLoading } = useRequireAuth();
    const [range, setRange] = useState<StatsRange>('4w');
    const [data, setData] = useState<StatsData | null>(null);

    useEffect(() => {
        if (!supabase || !user) return;
        const client = supabase;
        let cancelled = false;

        const load = async () => {
            const now = new Date();
            const from = rangeStart(range, now);
            // Doppeltes Fenster, damit der Trend zur Vorperiode ohne zweite Abfrage berechnet werden kann.
            const fetchFrom = from ? new Date(from.getTime() - (now.getTime() - from.getTime())) : null;
            const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

            let historyQuery = client
                .from('bookings')
                .select(SELECT)
                .lt('start_time', now.toISOString())
                .order('start_time', { ascending: true });
            if (fetchFrom) historyQuery = historyQuery.gte('start_time', fetchFrom.toISOString());

            const [history, future, mine] = await Promise.all([
                historyQuery,
                client
                    .from('bookings')
                    .select(SELECT)
                    .eq('status', 'active')
                    .gt('end_time', now.toISOString())
                    .lte('start_time', weekEnd.toISOString()),
                client.from('bookings').select('*').eq('user_id', user.id),
            ]);

            if (cancelled) return;
            const error = history.error ?? future.error ?? mine.error;
            if (error) {
                toast.error(`Statistik konnte nicht geladen werden: ${error.message}`);
                return;
            }
            setData({
                history: (history.data ?? []) as Booking[],
                future: (future.data ?? []) as Booking[],
                mine: (mine.data ?? []) as Booking[],
                now,
            });
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [user, range]);

    const computed = useMemo(() => {
        if (!data || !user) return null;
        const { history, future, mine, now } = data;
        const active = history.filter(b => b.status === 'active');
        const from =
            rangeStart(range, now) ??
            (active.length > 0 ? startOfDay(new Date(active[0].start_time)) : startOfDay(now));
        const inRange = history.filter(b => new Date(b.start_time) >= from);

        let previous: Occupancy | null = null;
        if (range !== 'all') {
            const length = now.getTime() - from.getTime();
            const prevFrom = new Date(from.getTime() - length);
            const prevSet = history.filter(b => {
                const s = new Date(b.start_time);
                return s >= prevFrom && s < from;
            });
            previous = overallOccupancy(prevSet, prevFrom, from);
        }

        const matrix = occupancyMatrix(inRange, from, now);
        return {
            hasHistory: inRange.some(b => b.status === 'active'),
            matrix,
            occupancy: overallOccupancy(inRange, from, now),
            previous,
            distribution: slotDistribution(inRange, now),
            extensions: extensionsPerSlot(inRange),
            board: leaderboard(inRange, now),
            chances: bestChances(matrix, future, now),
            nextFree: findNextFreeSlot(future, now),
            my: myStats(mine, user.id, now),
        };
    }, [data, range, user]);

    const periodLabel = RANGE_LABEL(range);

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl uppercase tracking-wider">Statistik</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Wann die Säule frei ist und wer sie nutzt.</p>
                </div>
                <RangeToggle value={range} onChange={setRange} />
            </header>

            {authLoading || !computed ? (
                <StatsSkeleton />
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-3">
                        <BestChanceCard
                            chances={computed.chances}
                            nextFree={computed.nextFree}
                            hasHistory={computed.hasHistory}
                        />
                        <OccupancyTile
                            current={computed.occupancy}
                            previous={computed.previous}
                            periodLabel={periodLabel}
                        />
                    </div>

                    {computed.hasHistory ? (
                        <>
                            <Heatmap matrix={computed.matrix} periodLabel={periodLabel} />
                            <div className="grid gap-6 md:grid-cols-2">
                                <SlotBars
                                    counts={computed.distribution}
                                    extensions={computed.extensions}
                                    periodLabel={periodLabel}
                                />
                                <Leaderboard
                                    entries={computed.board}
                                    currentUserId={user?.id ?? null}
                                    periodLabel={periodLabel}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="glass flex flex-col items-center rounded-xl px-6 py-14 text-center">
                            <BarChart3 size={40} strokeWidth={1.5} className="mb-3 text-muted-foreground opacity-30" />
                            <p className="text-sm text-muted-foreground">Noch keine Ladungen im Zeitraum „{periodLabel}“.</p>
                            <p className="mt-1 text-xs text-muted-foreground">Sobald gebucht und geladen wird, füllt sich hier die Heatmap.</p>
                        </div>
                    )}

                    <MyStatsCard stats={computed.my} />
                </>
            )}
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="h-[220px] rounded-xl md:col-span-2" />
                <Skeleton className="h-[220px] rounded-xl" />
            </div>
            <Skeleton className="h-[240px] rounded-xl" />
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[260px] rounded-xl" />
                <Skeleton className="h-[260px] rounded-xl" />
            </div>
        </div>
    );
}
