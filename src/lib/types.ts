export type Booking = {
    id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    duration: number;
    status: 'active' | 'cancelled';
    charging_status?: 'charging' | 'not_charging' | 'unknown';
    reporter_id?: string;
    profiles?: {
        first_name: string;
        last_name: string;
        avatar_url?: string;
        booking_count?: number;
    };
};
