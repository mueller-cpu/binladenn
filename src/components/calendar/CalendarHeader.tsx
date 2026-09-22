'use client';

import { addDays, format, isSameDay, isTomorrow, isToday, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'day' | 'week';

interface CalendarHeaderProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    date: Date;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

export function CalendarHeader({ viewMode, onViewModeChange, date, onPrev, onNext, onToday }: CalendarHeaderProps) {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);

    const primary = viewMode === 'day'
        ? isToday(date) ? 'Heute' : isTomorrow(date) ? 'Morgen' : format(date, 'EEEE', { locale: de })
        : `KW ${format(weekStart, 'I')}`;

    const secondary = viewMode === 'day'
        ? format(date, 'EEEE, d. MMMM', { locale: de })
        : `${format(weekStart, 'd. MMM', { locale: de })} – ${format(weekEnd, 'd. MMM', { locale: de })}`;

    const isCurrent = viewMode === 'day' ? isToday(date) : isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <div className="font-display text-xl uppercase tracking-wider">{primary}</div>
                <div className="text-sm text-muted-foreground">{secondary}</div>
            </div>

            <div className="flex items-center gap-2">
                <div role="tablist" aria-label="Ansicht" className="glass flex rounded-lg p-0.5">
                    {(['day', 'week'] as ViewMode[]).map(mode => {
                        const active = viewMode === mode;
                        return (
                            <button
                                key={mode}
                                role="tab"
                                type="button"
                                aria-selected={active}
                                onClick={() => onViewModeChange(mode)}
                                className={cn(
                                    'h-8 rounded-md px-3 text-xs font-medium transition-all duration-200',
                                    active ? 'bg-foreground/[0.08] text-foreground' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {mode === 'day' ? 'Tag' : 'Woche'}
                            </button>
                        );
                    })}
                </div>

                <div className="glass flex items-center rounded-lg p-0.5">
                    <button
                        type="button"
                        aria-label={viewMode === 'day' ? 'Vorheriger Tag' : 'Vorherige Woche'}
                        onClick={onPrev}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={onToday}
                        disabled={isCurrent}
                        className={cn(
                            'h-8 rounded-md px-3 text-xs font-medium transition-colors duration-200',
                            isCurrent ? 'text-muted-foreground/50' : 'text-neon hover:bg-neon/10'
                        )}
                    >
                        Heute
                    </button>
                    <button
                        type="button"
                        aria-label={viewMode === 'day' ? 'Nächster Tag' : 'Nächste Woche'}
                        onClick={onNext}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
