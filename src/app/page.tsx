'use client';

import { useEffect, useState } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DayView } from '@/components/calendar/DayView';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { TimeSlot, getSlotDate } from '@/lib/booking-utils';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]); // TODO: Type properly
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!supabase) return;
    setLoading(true);

    // Fetch bookings for the selected day
    // We need to cover the full 24h of the selected day
    const start = startOfDay(currentDate);
    const end = addDays(start, 1);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles (
          first_name,
          last_name
        )
      `)
      .gte('start_time', start.toISOString())
      .lt('start_time', end.toISOString());

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
  }, [currentDate]);

  const handlePrevDay = () => setCurrentDate(d => addDays(d, -1));
  const handleNextDay = () => setCurrentDate(d => addDays(d, 1));

  const handleBook = async (slot: TimeSlot, duration: 4 | 8, notes: string) => {
    if (!user || !supabase) return;

    const start = getSlotDate(currentDate, slot);
    const end = new Date(start);
    end.setHours(start.getHours() + duration);

    // Optimistic update or refetch? Refetch is safer for MVP.
    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration: duration,
      booking_type: 'regular' // notes not yet in schema? wait, schema doesn't have notes column? 
      // Spec F-004 says "Optional: Notiz-Feld" in UI, but schema "cancellation_reason" exists.
      // Schema in 00_init_schema.sql does NOT have a notes column for active bookings!
      // Constraint: "Use generate_image tool to create a working demonstration" -> No, this is logic.
      // Let's check schema again.
      // "cancellation_reason TEXT" exists.
      // I missed adding a 'notes' column in the schema implementation?
      // Let's re-read the spec.
      // Spec 438: "Optional: Notiz-Feld" in dialog.
      // Schema 5.2: No notes/description column. 
      // I should add it or ignore it. For now, I'll ignore storing it in DB to stick to schema, 
      // OR I can add it to metadata if Supabase supports it? 
      // Bookings table plain...
      // I'll skip saving notes for now to strictly follow schema provided in spec 5.2.
      // Wait, I should probably add it if the user wants it.
      // Let's stick to the spec schema for now to avoid drift.
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
    // Soft delete? Spec says: "User können eigene Buchungen jederzeit löschen".
    // Schema says: status TEXT CHECK (status IN ('active', 'cancelled'))
    // So update status to 'cancelled'.

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
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center font-medium">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {format(currentDate, 'dd.MM.yyyy')}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DayView
          date={currentDate}
          bookings={bookings}
          currentUser={user}
          onBook={handleBook}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
