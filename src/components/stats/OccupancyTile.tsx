import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { StatCard } from './StatCard';
import type { Occupancy } from '@/lib/stats';

interface OccupancyTileProps {
    current: Occupancy;
    previous: Occupancy | null;
    periodLabel: string;
}

export function OccupancyTile({ current, previous, periodLabel }: OccupancyTileProps) {
    const percent = Math.round(current.ratio * 100);
    const deltaPoints = previous && previous.total > 0 ? Math.round((current.ratio - previous.ratio) * 100) : null;
    const DeltaIcon = deltaPoints === null || deltaPoints === 0 ? Minus : deltaPoints > 0 ? ArrowUpRight : ArrowDownRight;

    return (
        <StatCard title="Auslastung" subtitle={periodLabel}>
            <div className="flex h-full flex-col justify-between gap-4">
                <div>
                    <div className="text-5xl font-semibold leading-none tracking-tight">
                        {percent}
                        <span className="ml-1 text-2xl text-muted-foreground">%</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {current.booked} von {current.total} Slots belegt
                    </p>
                </div>
                {deltaPoints !== null && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <DeltaIcon size={14} strokeWidth={2} className="text-foreground" />
                        <span className="font-medium text-foreground">
                            {deltaPoints > 0 ? '+' : ''}{deltaPoints} Punkte
                        </span>
                        <span>vs. Vorperiode</span>
                    </div>
                )}
            </div>
        </StatCard>
    );
}
