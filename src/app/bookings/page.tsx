'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ArrowLeft, History, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { supabase } from '@/lib/supabase';
import { formatDay, formatTimeRange, hoursBetween } from '@/lib/booking-utils';
import type { Booking } from '@/lib/types';
import { cn } from '@/lib/utils';

const UNDO_DURATION_MS = 5000;

export default function BookingHistoryPage() {
    const { user, isLoading: authLoading } = useRequireAuth();
    const [bookings, setBookings] = useState<Booking[] | null>(null);

    const load = useCallback(async () => {
        if (!user || !supabase) return;
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', user.id)
            .order('start_time', { ascending: false });

        if (error) {
            toast.error('Buchungen konnten nicht geladen werden.');
            return;
        }
        setBookings((data ?? []) as Booking[]);
    }, [user]);

    useEffect(() => {
        load();
    }, [load]);

    const setStatus = async (booking: Booking, status: Booking['status']) => {
        if (!supabase) return;
        setBookings(prev => prev?.map(b => (b.id === booking.id ? { ...b, status } : b)) ?? prev);
        const { error } = await supabase.from('bookings').update({ status }).eq('id', booking.id);
        if (error) {
            setBookings(prev => prev?.map(b => (b.id === booking.id ? booking : b)) ?? prev);
            toast.error(error.code === '23P01' ? 'Der Slot ist inzwischen vergeben.' : error.message);
            return false;
        }
        return true;
    };

    const cancel = async (booking: Booking) => {
        if (!(await setStatus(booking, 'cancelled'))) return;
        const start = new Date(booking.start_time);
        const end = new Date(booking.end_time);
        toast('Buchung gelöscht', {
            description: `${formatDay(start)} · ${formatTimeRange(start, end)}`,
            duration: UNDO_DURATION_MS,
            action: {
                label: 'Rückgängig',
                onClick: async () => {
                    if (await setStatus(booking, 'active')) toast.success('Buchung wiederhergestellt.');
                },
            },
        });
    };

    const now = new Date();
    const upcoming = (bookings ?? []).filter(b => b.status === 'active' && new Date(b.end_time) > now)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    const past = (bookings ?? []).filter(b => b.status !== 'active' || new Date(b.end_time) <= now);

    return (
        <div className="max-w-2xl space-y-8">
            <header>
                <Link href="/profile" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                    <ArrowLeft size={14} />
                    Profil
                </Link>
                <h1 className="font-display text-2xl uppercase tracking-wider">Buchungsverlauf</h1>
                <p className="mt-1 text-sm text-muted-foreground">Alle deine Ladezeiten, geplant und vergangen.</p>
            </header>

            {authLoading || bookings === null ? (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
                </div>
            ) : (
                <>
                    <section className="space-y-3">
                        <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground">Geplant</h2>
                        {upcoming.length === 0 ? (
                            <p className="glass rounded-xl p-5 text-sm text-muted-foreground">
                                Nichts geplant.{' '}
                                <Link href="/overview" className="text-neon hover:underline">Zum Kalender</Link>
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {upcoming.map(b => <HistoryRow key={b.id} booking={b} onCancel={() => cancel(b)} />)}
                            </ul>
                        )}
                    </section>

                    <section className="space-y-3">
                        <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground">Vergangen</h2>
                        {past.length === 0 ? (
                            <div className="glass flex flex-col items-center rounded-xl px-6 py-12 text-center">
                                <History size={32} strokeWidth={1.5} className="mb-3 text-muted-foreground opacity-30" />
                                <p className="text-sm text-muted-foreground">Noch keine vergangenen Buchungen.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {past.map(b => <HistoryRow key={b.id} booking={b} />)}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

function HistoryRow({ booking, onCancel }: { booking: Booking; onCancel?: () => void }) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const cancelled = booking.status === 'cancelled';
    const reported = booking.charging_status === 'not_charging';
    const charged = booking.charging_status === 'charging';

    return (
        <li className={cn('glass flex items-center gap-4 rounded-xl p-4', cancelled && 'opacity-60')}>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{format(start, 'EEEE, d. MMMM yyyy', { locale: de })}</span>
                    {cancelled && (
                        <span className="rounded-md border border-foreground/10 px-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                            Gelöscht
                        </span>
                    )}
                    {reported && (
                        <span className="rounded-md border border-destructive/25 bg-destructive/10 px-1.5 text-[10px] uppercase tracking-widest text-destructive">
                            Gemeldet
                        </span>
                    )}
                    {charged && !cancelled && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-neon/20 bg-neon/10 px-1.5 text-[10px] uppercase tracking-widest text-neon">
                            <Zap size={9} strokeWidth={3} /> Geladen
                        </span>
                    )}
                </div>
                <div className="text-xs tabular-nums text-muted-foreground">
                    {formatTimeRange(start, end)} · {hoursBetween(start, end)} h
                </div>
            </div>
            {onCancel && (
                <button
                    type="button"
                    aria-label="Buchung löschen"
                    onClick={onCancel}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </li>
    );
}
