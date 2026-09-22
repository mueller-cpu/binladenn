import { StatCard } from './StatCard';
import { TIME_SLOTS } from '@/lib/booking-utils';

interface SlotBarsProps {
    counts: number[];
    extensions: number[];
    periodLabel: string;
}

/** Drei horizontale Balken: Buchungen je Slot. Wert an der Spitze, Verlängerungen als Fußnote. */
export function SlotBars({ counts, extensions, periodLabel }: SlotBarsProps) {
    const max = Math.max(1, ...counts);

    return (
        <StatCard title="Beliebte Zeiten" subtitle={`Ladungen je Slot · ${periodLabel}`}>
            <ul className="space-y-4">
                {TIME_SLOTS.map((slot, i) => {
                    const count = counts[i] ?? 0;
                    const width = `${Math.max(count === 0 ? 0 : 2, (count / max) * 100)}%`;
                    return (
                        <li key={slot.id}>
                            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                                <span className="font-medium">
                                    {slot.label}
                                    <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                                        {slot.startTime}–{slot.endTime}
                                    </span>
                                </span>
                                <span className="font-semibold tabular-nums">{count}</span>
                            </div>
                            <div
                                role="img"
                                aria-label={`${slot.label}: ${count} Ladungen`}
                                className="h-3 w-full overflow-hidden rounded-r-[4px] bg-foreground/[0.06]"
                            >
                                <div
                                    className="h-full rounded-r-[4px] bg-neon transition-[width] duration-500 ease-out"
                                    style={{ width }}
                                />
                            </div>
                            {(extensions[i] ?? 0) > 0 && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    {extensions[i]} × verlängert
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </StatCard>
    );
}
