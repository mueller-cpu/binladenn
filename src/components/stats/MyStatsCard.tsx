import { StatCard } from './StatCard';
import { calculateLevel, getNextLevel } from '@/lib/gamification';
import type { MyStats } from '@/lib/stats';

interface MyStatsCardProps {
    stats: MyStats;
}

const POINTS_PER_CHARGE = 10;

function percentOrDash(ratio: number | null): string {
    return ratio === null ? '–' : `${Math.round(ratio * 100)} %`;
}

export function MyStatsCard({ stats }: MyStatsCardProps) {
    const points = stats.totalCount * POINTS_PER_CHARGE;
    const level = calculateLevel(points);
    const next = getNextLevel(level);
    const LevelIcon = level.icon;
    const progress = next ? ((points - level.minPoints) / (next.minPoints - level.minPoints)) * 100 : 100;

    const tiles: { label: string; value: string; hint?: string }[] = [
        { label: 'Ladungen', value: String(stats.monthCount), hint: 'diesen Monat' },
        { label: 'Stunden', value: String(stats.monthHours), hint: 'diesen Monat' },
        { label: 'Lieblings-Slot', value: stats.favoriteSlot?.label ?? '–', hint: stats.favoriteSlot ? `${stats.favoriteSlot.startTime}–${stats.favoriteSlot.endTime}` : 'noch offen' },
        { label: 'Serie', value: stats.streakWeeks === 0 ? '–' : `${stats.streakWeeks} Wo.`, hint: 'in Folge geladen' },
        { label: 'Bestätigt', value: percentOrDash(stats.confirmedRate), hint: 'der Ladungen' },
        { label: 'Storniert', value: percentOrDash(stats.cancelRate), hint: 'der Buchungen' },
    ];

    return (
        <StatCard title="Meine Zahlen" subtitle="Dein Rang und dein Monat">
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neon/10 text-neon shadow-[inset_0_0_0_1px_hsl(var(--neon)/0.15)]">
                        <LevelIcon size={26} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-lg uppercase tracking-wider">{level.title}</div>
                        <p className="text-xs text-muted-foreground">{level.description}</p>
                    </div>
                </div>

                <div>
                    <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted-foreground">
                        <span><span className="font-semibold text-foreground">{points}</span> Punkte</span>
                        {next ? (
                            <span>noch {next.minPoints - points} bis „{next.title}“</span>
                        ) : (
                            <span>Maximales Level</span>
                        )}
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neon/10">
                        <div
                            className="h-full rounded-full bg-neon transition-[width] duration-700 ease-out"
                            style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
                        />
                    </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {tiles.map(tile => (
                        <div key={tile.label} className="rounded-lg bg-foreground/[0.03] p-3">
                            <dt className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{tile.label}</dt>
                            <dd className="mt-1 truncate text-xl font-semibold">{tile.value}</dd>
                            {tile.hint && <dd className="text-[11px] text-muted-foreground">{tile.hint}</dd>}
                        </div>
                    ))}
                </dl>

                {stats.extensions > 0 && (
                    <p className="text-xs text-muted-foreground">
                        Du hast {stats.extensions} × verlängert.
                    </p>
                )}
            </div>
        </StatCard>
    );
}
