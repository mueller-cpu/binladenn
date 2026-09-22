'use client';

import { cn } from '@/lib/utils';
import type { StatsRange } from '@/lib/stats';

const OPTIONS: { value: StatsRange; label: string }[] = [
    { value: '4w', label: '4 Wochen' },
    { value: '3m', label: '3 Monate' },
    { value: 'all', label: 'Gesamt' },
];

export function RANGE_LABEL(range: StatsRange): string {
    return OPTIONS.find(o => o.value === range)?.label ?? '';
}

export function RangeToggle({ value, onChange }: { value: StatsRange; onChange: (r: StatsRange) => void }) {
    return (
        <div role="tablist" aria-label="Zeitraum" className="glass inline-flex rounded-lg p-0.5">
            {OPTIONS.map(opt => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        role="tab"
                        type="button"
                        aria-selected={active}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'h-8 rounded-md px-3 text-xs font-medium transition-all duration-200',
                            active ? 'bg-foreground/[0.08] text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
