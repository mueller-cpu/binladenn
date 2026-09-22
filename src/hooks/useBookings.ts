'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Booking, BookingProfile } from '@/lib/types';
import { TimeSlot, formatDay, formatTimeRange, hoursBetween, plusHours } from '@/lib/booking-utils';
import { getSlotState } from '@/lib/slot-state';

export const BOOKING_PROFILE_SELECT =
    'profiles:profiles!bookings_user_id_fkey(first_name,last_name,avatar_url,booking_count)';
const BOOKING_SELECT = `*, ${BOOKING_PROFILE_SELECT}`;

const EXCLUSION_VIOLATION = '23P01';
const RAISE_EXCEPTION = 'P0001';
const REALTIME_DEBOUNCE_MS = 200;
const UNDO_DURATION_MS = 5000;

export interface BookingRange {
    from: Date;
    to: Date;
}

interface DbError {
    code?: string;
    message: string;
}

function describeError(error: DbError, conflictText = 'Der Slot wurde gerade vergeben.'): string {
    if (error.code === EXCLUSION_VIOLATION) return conflictText;
    if (error.code === RAISE_EXCEPTION) return error.message;
    return error.message || 'Unbekannter Fehler';
}

function vibrate(ms = 10) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(ms);
    }
}

export function useBookings(range: BookingRange, user: User | null) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [myProfile, setMyProfile] = useState<BookingProfile | null>(null);

    // Immer der aktuelle Stand für Callbacks, ohne sie bei jedem Render neu zu erzeugen.
    const bookingsRef = useRef<Booking[]>([]);
    bookingsRef.current = bookings;

    const fromMs = range.from.getTime();
    const toMs = range.to.getTime();

    const fetchBookings = useCallback(async (silent: boolean) => {
        if (!supabase) {
            setLoading(false);
            return;
        }
        if (!silent) setLoading(true);

        const { data, error } = await supabase
            .from('bookings')
            .select(BOOKING_SELECT)
            .eq('status', 'active')
            .lt('start_time', new Date(toMs).toISOString())
            .gt('end_time', new Date(fromMs).toISOString())
            .order('start_time', { ascending: true });

        if (error) {
            setError(error.message);
            if (!silent) toast.error(`Buchungen konnten nicht geladen werden: ${error.message}`);
        } else {
            setBookings((data ?? []) as Booking[]);
            setError(null);
        }
        setLoading(false);
    }, [fromMs, toMs]);

    // Erstes Laden und Laden bei Bereichswechsel: mit Skeleton.
    useEffect(() => {
        fetchBookings(false);
    }, [fetchBookings]);

    // Eigenes Profil für optimistische Karten.
    useEffect(() => {
        if (!supabase || !user) {
            setMyProfile(null);
            return;
        }
        supabase
            .from('profiles')
            .select('first_name,last_name,avatar_url,booking_count')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data) setMyProfile(data as BookingProfile);
            });
    }, [user]);

    // Realtime: jede Änderung an bookings löst einen stillen, entprellten Refetch aus.
    useEffect(() => {
        if (!supabase) return;
        const client = supabase;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const schedule = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fetchBookings(true), REALTIME_DEBOUNCE_MS);
        };

        const channel = client
            .channel(`bookings-live-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, schedule)
            .subscribe();

        const onVisible = () => {
            if (document.visibilityState === 'visible') schedule();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            if (timer) clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisible);
            client.removeChannel(channel);
        };
    }, [fetchBookings]);

    const replaceBooking = (id: string, next: Booking | null) => {
        setBookings(prev => {
            const without = prev.filter(b => b.id !== id);
            return next ? [...without, next] : without;
        });
    };

    const book = useCallback(async (date: Date, slot: TimeSlot) => {
        if (!supabase || !user) return;

        const state = getSlotState(date, slot, bookingsRef.current, user.id, new Date());
        if (state.kind !== 'free' || state.isPast) return;

        const start = state.availableFrom;
        const end = state.end;
        const tempId = `temp-${Date.now()}`;
        const optimistic: Booking = {
            id: tempId,
            user_id: user.id,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            duration: hoursBetween(start, end),
            status: 'active',
            charging_status: 'unknown',
            profiles: myProfile,
        };
        setBookings(prev => [...prev, optimistic]);
        vibrate();

        const { data, error } = await supabase
            .from('bookings')
            .insert({
                user_id: user.id,
                start_time: optimistic.start_time,
                end_time: optimistic.end_time,
                duration: optimistic.duration,
                booking_type: 'regular',
            })
            .select(BOOKING_SELECT)
            .single();

        if (error) {
            replaceBooking(tempId, null);
            toast.error(describeError(error));
            return;
        }
        replaceBooking(tempId, data as Booking);
    }, [user, myProfile]);

    const restore = useCallback(async (booking: Booking) => {
        if (!supabase) return;
        setBookings(prev => (prev.some(b => b.id === booking.id) ? prev : [...prev, booking]));

        const { error } = await supabase
            .from('bookings')
            .update({ status: 'active' })
            .eq('id', booking.id);

        if (error) {
            replaceBooking(booking.id, null);
            toast.error(describeError(error, 'Der Slot ist inzwischen vergeben.'));
            return;
        }
        toast.success('Buchung wiederhergestellt.');
    }, []);

    const cancel = useCallback(async (booking: Booking) => {
        if (!supabase) return;
        replaceBooking(booking.id, null);
        vibrate();

        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', booking.id);

        if (error) {
            replaceBooking(booking.id, booking);
            toast.error(`Löschen fehlgeschlagen: ${error.message}`);
            return;
        }

        const start = new Date(booking.start_time);
        const end = new Date(booking.end_time);
        toast('Buchung gelöscht', {
            description: `${formatDay(start)} · ${formatTimeRange(start, end)}`,
            duration: UNDO_DURATION_MS,
            action: {
                label: 'Rückgängig',
                onClick: () => restore(booking),
            },
        });
    }, [restore]);

    const extend = useCallback(async (booking: Booking, delta: 1 | -1) => {
        if (!supabase) return;
        const start = new Date(booking.start_time);
        const newEnd = plusHours(new Date(booking.end_time), delta);
        const patch = { end_time: newEnd.toISOString(), duration: hoursBetween(start, newEnd) };

        replaceBooking(booking.id, { ...booking, ...patch });
        vibrate();

        const { error } = await supabase.from('bookings').update(patch).eq('id', booking.id);
        if (error) {
            replaceBooking(booking.id, booking);
            toast.error(describeError(error, 'Die Stunde ist inzwischen vergeben.'));
        }
    }, []);

    const confirmCharging = useCallback(async (booking: Booking) => {
        if (!supabase) return;
        replaceBooking(booking.id, { ...booking, charging_status: 'charging' });

        const { error } = await supabase
            .from('bookings')
            .update({ charging_status: 'charging' })
            .eq('id', booking.id);

        if (error) {
            replaceBooking(booking.id, booking);
            toast.error(`Bestätigen fehlgeschlagen: ${error.message}`);
            return;
        }
        toast.success('Ladevorgang bestätigt.');
    }, []);

    const report = useCallback(async (booking: Booking) => {
        if (!supabase) return;
        const { error } = await supabase.rpc('report_booking_abuse', { booking_id: booking.id });
        if (error) {
            toast.error(describeError(error));
            return;
        }
        toast.success('Gemeldet. Der Nutzer ist 7 Tage gesperrt.');
        fetchBookings(true);
    }, [fetchBookings]);

    const undoReport = useCallback(async (booking: Booking) => {
        if (!supabase) return;
        const { error } = await supabase.rpc('undo_report_abuse', { booking_id: booking.id });
        if (error) {
            toast.error(describeError(error));
            return;
        }
        toast.success('Meldung zurückgezogen. Sperre aufgehoben.');
        fetchBookings(true);
    }, [fetchBookings]);

    const refetch = useCallback(() => fetchBookings(true), [fetchBookings]);

    return { bookings, loading, error, myProfile, book, cancel, extend, confirmCharging, report, undoReport, refetch };
}

export type BookingActions = Pick<
    ReturnType<typeof useBookings>,
    'book' | 'cancel' | 'extend' | 'confirmCharging' | 'report' | 'undoReport'
>;
