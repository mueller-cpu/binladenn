import { StatCard } from './StatCard';
import { TIME_SLOTS } from '@/lib/booking-utils';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface HeatmapProps {
    matrix: number[][];
    periodLabel: string;
}

/** Wochentag × Slot als Belegungsquote. Eine Farbe, Deckkraft trägt den Wert. */
export function Heatmap({ matrix, periodLabel }: HeatmapProps) {
    return (
        <StatCard title="Wann ist es voll?" subtitle={`Belegung nach Wochentag und Slot · ${periodLabel}`}>
            <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-1.5 sm:gap-2">
                <div />
                {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        {d}
                    </div>
                ))}

                {TIME_SLOTS.map((slot, slotIdx) => (
                    <HeatRow
                        key={slot.id}
                        label={slot.shortLabel}
                        title={`${slot.label} ${slot.startTime}–${slot.endTime}`}
                        values={WEEKDAYS.map((_, wd) => matrix[wd]?.[slotIdx] ?? 0)}
                        slotLabel={slot.label}
                    />
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>frei</span>
                <div
                    aria-hidden
                    className="h-1.5 flex-1 rounded-full"
                    style={{ background: 'linear-gradient(90deg, hsl(var(--neon) / 0.06), hsl(var(--neon) / 0.9))' }}
                />
                <span>voll</span>
            </div>
        </StatCard>
    );
}

function HeatRow({ label, title, values, slotLabel }: { label: string; title: string; values: number[]; slotLabel: string }) {
    return (
        <>
            <div
                title={title}
                className="flex items-center justify-end pr-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
            >
                {label}
            </div>
            {values.map((ratio, wd) => {
                const percent = Math.round(ratio * 100);
                const alpha = 0.06 + ratio * 0.84;
                return (
                    <div
                        key={wd}
                        role="img"
                        aria-label={`${WEEKDAYS[wd]} ${slotLabel}: ${percent} % belegt`}
                        title={`${WEEKDAYS[wd]} · ${slotLabel} · ${percent} % belegt`}
                        className={cn(
                            'flex h-10 items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-transform duration-200 hover:scale-[1.04]',
                            ratio > 0.55 ? 'text-primary-foreground' : 'text-foreground/70'
                        )}
                        style={{ background: `hsl(var(--neon) / ${alpha.toFixed(2)})` }}
                    >
                        {percent}
                    </div>
                );
            })}
        </>
    );
}
