'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';

export default function MyBookingsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }

        if (user && supabase) {
            fetchMyBookings();
        }
    }, [user, authLoading, router]);

    const fetchMyBookings = async () => {
        if (!user || !supabase) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', user.id)
            .order('start_time', { ascending: true }); // Future first? Or separate lists? Let's just list all.

        if (error) {
            console.error('Error fetching bookings:', error);
            toast.error('Fehler beim Laden deiner Buchungen');
        } else {
            setBookings(data || []);
        }
        setLoading(false);
    };

    const handleCancel = async (bookingId: string) => {
        if (!confirm("Möchtest du diese Buchung wirklich stornieren?")) return;
        if (!supabase) return;

        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId);

        if (error) {
            console.error("Cancellation failed:", JSON.stringify(error, null, 2));
            toast.error(`Fehler beim Stornieren: ${error.message}`);
        } else {
            toast.success("Buchung storniert.");
            fetchMyBookings();
        }
    };

    if (authLoading || loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    const upcomingBookings = bookings.filter(b => !isPast(new Date(b.end_time)) && b.status === 'active');
    const pastBookings = bookings.filter(b => isPast(new Date(b.end_time)) || b.status !== 'active');

    return (
        <div className="space-y-6">
            <Toaster position="top-center" />
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Meine Buchungen</h1>
                <p className="text-muted-foreground">Verwalte deine geplanten Ladezeiten.</p>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Aktuell & Zukunft</h2>
                {upcomingBookings.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Keine aktiven Buchungen. Zeit zum Laden!
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {upcomingBookings.map(booking => (
                            <BookingCard key={booking.id} booking={booking} onCancel={() => handleCancel(booking.id)} />
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-4 pt-4">
                <h2 className="text-xl font-semibold text-muted-foreground">Vergangen / Storniert</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-60 hover:opacity-100 transition-opacity">
                    {pastBookings.map(booking => (
                        <BookingCard key={booking.id} booking={booking} isHistory />
                    ))}
                </div>
            </div>
        </div>
    );
}

function BookingCard({ booking, onCancel, isHistory }: { booking: any, onCancel?: () => void, isHistory?: boolean }) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const isCancelled = booking.status === 'cancelled';

    return (
        <Card className={cn(isCancelled && "bg-muted")}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between items-start">
                    <span>{format(start, 'dd.MM.yyyy')}</span>
                    {isCancelled && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Storniert</span>}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(start, 'HH:mm')} - {format(end, 'HH:mm')} ({booking.duration}h)
                </CardDescription>
            </CardHeader>
            {!isHistory && onCancel && (
                <CardFooter>
                    <Button variant="destructive" size="sm" className="w-full" onClick={onCancel}>
                        Stornieren
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
