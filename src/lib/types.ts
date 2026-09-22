export type ChargingStatus = 'charging' | 'not_charging' | 'unknown';

export interface BookingProfile {
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
    /** Computed column aus Supabase: abgeschlossene, nicht gemeldete Ladungen */
    booking_count?: number;
}

export type Booking = {
    id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    duration: number;
    status: 'active' | 'cancelled';
    booking_type?: 'regular' | 'maintenance';
    charging_status?: ChargingStatus | null;
    reporter_id?: string | null;
    created_at?: string;
    profiles?: BookingProfile | null;
};

export interface Profile {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    role: 'user' | 'admin';
    avatar_url?: string | null;
    banned_until?: string | null;
}
