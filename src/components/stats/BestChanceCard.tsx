'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronRight, Sparkles, Zap } from 'lucide-react';
import { StatCard } from './StatCard';
import { formatDay, formatTimeRange } from '@/lib/booking-utils';
import type { Chance } from '@/lib/stats';
import type { NextFreeSlot } from '@/lib/slot-state';

interface BestChanceCardProps {
    chances: Chance[];
    nextFree: NextFreeSlot | null;
    hasHistory: boolean;
}

function dayLink(date: Date): string {
    return `/overview?date=${format(date, 'yyyy-MM-dd')}`;
}

export function BestChanceCard({ chances, nextFree, hasHistory }: BestChanceCardProps) {
    return (
        <StatCard
            title="Beste Chance"
            subtitle={hasHistory ? 'Freie Slots dieser Woche, die sonst selten belegt sind' : 'Freie Slots dieser Woche'}
        >
            <div className="space-y-4">
                {nextFree && (
                    <Link
                        href={dayLink(nextFree.date)}
                        className="flex items-center gap-3 rounded-lg bg-neon/10 px-3 py-2.5 shadow-[inset_0_0_0_1px_hsl(var(--neon)/0.15)] transition-colors duration-200 hover:bg-neon/15"
                    >
                        <Zap size={16} strokeWidth={2} className="shrink-0 text-neon" />
                        <div className="min-w-0 flex-1 text-sm">
                            <span className="text-muted-foreground">Nächster freier Slot: </span>
                            <span className="font-semibold">
                                {formatDay(nextFree.date)} · {formatTimeRange(nextFree.start, nextFree.end)}
                            </span>
                        </div>
                        <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                    </Link>
                )}

                {chances.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        Diese Woche ist alles vergeben.
                    </p>
                ) : (
                    <ul className="divide-y divide-foreground/[0.06]">
                        {chances.map((c, i) => (
                            <li key={`${c.date.toISOString()}-${c.slot.id}`}>
                                <Link
                                    href={dayLink(c.date)}
                                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.04]"
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05] text-xs font-semibold text-muted-foreground">
                                        {i === 0 ? <Sparkles size={14} strokeWidth={2} className="text-neon" /> : i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium">
                                            {format(c.date, 'EEEE', { locale: de })}
                                            <span className="mx-1.5 text-muted-foreground">·</span>
                                            {c.slot.label}
                                        </div>
                                        <div className="text-xs tabular-nums text-muted-foreground">
                                            {formatTimeRange(c.start, c.end)}
                                        </div>
                                    </div>
                                    {hasHistory && (
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            sonst {Math.round(c.ratio * 100)} % belegt
                                        </span>
                                    )}
                                    <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </StatCard>
    );
}
