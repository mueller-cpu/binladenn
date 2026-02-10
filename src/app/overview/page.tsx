'use client';

import { useEffect, useState } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DayView } from '@/components/calendar/DayView';
import { WeekView } from '@/components/calendar/WeekView';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { TimeSlot, getSlotDate } from '@/lib/booking-utils';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

export default function OverviewPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // View State for Calendar
    const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

    const fetchBookings = async () => {
        if (!supabase) return;
        setLoading(true);

        const start = startOfDay(currentDate);
        // If week view, fetch 7 days. If day view, fetch 1 day.
        const daysToFetch = viewMode === 'week' ? 7 : 1;
        const end = addDays(start, daysToFetch);

        const { data, error } = await supabase
            .from('bookings')
            .select(`
        *,
        profiles:profiles!bookings_user_id_fkey (
          first_name,
          last_name,
          banned_until
        )
      `)
            .lt('start_time', end.toISOString())
            .gt('end_time', start.toISOString());

        if (error) {
            console.error('Error fetching bookings:', JSON.stringify(error, null, 2));
            toast.error(`Fehler beim Laden: ${error.message || 'Unbekannter Fehler'}`);
        } else {
            setBookings(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBookings();
    }, [currentDate, viewMode]);

    const handlePrev = () => {
        const days = viewMode === 'week' ? 7 : 1;
        setCurrentDate(d => addDays(d, -days));
    };

    const handleNext = () => {
        const days = viewMode === 'week' ? 7 : 1;
        setCurrentDate(d => addDays(d, days));
    };

    const handleBook = async (slot: TimeSlot, duration: number, notes: string, dateOverride?: Date) => {
        if (!user || !supabase) return;

        // Check if user is banned
        const { data: profile } = await supabase.from('profiles').select('banned_until').eq('id', user.id).single();
        if (profile?.banned_until) {
            const bannedUntil = new Date(profile.banned_until);
            if (bannedUntil > new Date()) {
                toast.error(`Du bist bis zum ${format(bannedUntil, 'dd.MM.yyyy HH:mm')} gesperrt.`);
                return;
            }
        }

        const bookingDate = dateOverride || currentDate;
        const start = getSlotDate(bookingDate, slot);
        const end = new Date(start);
        end.setHours(start.getHours() + slot.duration);

        const { error } = await supabase.from('bookings').insert({
            user_id: user.id,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            duration: slot.duration,
            booking_type: 'regular'
        });

        if (error) {
            if (error.code === '23P01') { // Exclusion violation
                toast.error("Dieser Slot ist bereits gebucht (Konflikt).");
            } else {
                throw error;
            }
        } else {
            await fetchBookings();
        }
    };

    const handleCancel = async (bookingId: string) => {
        if (!supabase) return;

        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId);

        if (error) {
            console.error("Error cancelling:", error);
            toast.error("Fehler beim Stornieren.");
        } else {
            toast.success("Buchung storniert.");
            fetchBookings();
        }
    };

    if (authLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <Toaster position="top-center" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ladekalender</h1>
                    <p className="text-muted-foreground">
                        Buche dir deinen Slot an der Ladesäule.
                    </p>
                </div>

                <div className="flex flex-col gap-2 items-start sm:items-end w-full sm:w-auto">
                    <div className="flex items-center p-1 bg-muted rounded-lg border w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('day')}
                            className={`flex-1 sm:flex-none text-xs h-7 w-16 transition-all ${viewMode === 'day' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Tag
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('week')}
                            className={`flex-1 sm:flex-none text-xs h-7 w-16 transition-all ${viewMode === 'week' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Woche
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
                        <Button variant="ghost" size="icon" onClick={handlePrev}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center font-medium">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {viewMode === 'day' ? format(currentDate, 'dd.MM.yyyy') : `KW ${format(currentDate, 'w')}`}
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleNext}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                viewMode === 'day' ? (
                    <DayView
                        date={currentDate}
                        bookings={bookings}
                        currentUser={user}
                        onBook={(slot, dur, notes) => handleBook(slot, dur, notes, currentDate)}
                        onCancel={handleCancel}
                        onReport={async (bookingId) => {
                            if (!supabase) return;
                            const { error } = await supabase.rpc('report_booking_abuse', { booking_id: bookingId });
                            if (error) toast.error("Fehler beim Melden.");
                            else { toast.success("Nutzer gemeldet und für 7 Tage gesperrt."); fetchBookings(); }
                        }}
                        onConfirmCharging={async (bookingId) => {
                            if (!supabase) return;
                            const { error } = await supabase.from('bookings').update({ charging_status: 'charging' }).eq('id', bookingId);
                            if (error) toast.error("Fehler beim Bestätigen.");
                            else { toast.success("Ladevorgang bestätigt."); fetchBookings(); }
                        }}
                        onUndoReport={async (bookingId) => {
                            if (!supabase) return;
                            const { error } = await supabase.rpc('undo_report_abuse', { booking_id: bookingId });
                            if (error) toast.error("Fehler beim Zurückziehen.");
                            else { toast.success("Meldung zurückgezogen. Sperre aufgehoben."); fetchBookings(); }
                        }}
                    />
                ) : (
                    <WeekView
                        startDate={currentDate}
                        bookings={bookings}
                        currentUser={user}
                        onBook={handleBook}
                        onCancel={handleCancel}
                        onReport={async (bookingId) => {
                            if (!supabase) return;
                            const { error } = await supabase.rpc('report_booking_abuse', { booking_id: bookingId });
                            if (error) toast.error("Fehler beim Melden.");
                            else { toast.success("Nutzer gemeldet und für 7 Tage gesperrt."); fetchBookings(); }
                        }}
                        onConfirmCharging={async (bookingId) => {
                            if (!supabase) return;
                            const { error } = await supabase.from('bookings').update({ charging_status: 'charging' }).eq('id', bookingId);
                            if (error) toast.error("Fehler beim Bestätigen.");
                            else { toast.success("Ladevorgang bestätigt."); fetchBookings(); }
                        }}
                        onUndoReport={async (bookingId) => {
                            if (!supabase) return;
                            const { error } = await supabase.rpc('undo_report_abuse', { booking_id: bookingId });
                            if (error) toast.error("Fehler beim Zurückziehen.");
                            else { toast.success("Meldung zurückgezogen. Sperre aufgehoben."); fetchBookings(); }
                        }}
                    />
                )
            )}
        </div>
    );
}
