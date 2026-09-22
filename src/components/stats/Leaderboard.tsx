import { Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatCard } from './StatCard';
import { calculateLevel } from '@/lib/gamification';
import type { LeaderEntry } from '@/lib/stats';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
    entries: LeaderEntry[];
    currentUserId: string | null;
    periodLabel: string;
}

export function Leaderboard({ entries, currentUserId, periodLabel }: LeaderboardProps) {
    return (
        <StatCard title="Wer lädt am meisten?" subtitle={`Abgeschlossene Ladungen · ${periodLabel}`}>
            {entries.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                    <Trophy size={32} strokeWidth={1.5} className="mb-3 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">Noch keine abgeschlossenen Ladungen.</p>
                </div>
            ) : (
                <ol className="divide-y divide-foreground/[0.06]">
                    {entries.map((entry, i) => {
                        const isMe = entry.userId === currentUserId;
                        const level = calculateLevel(entry.count * 10);
                        const LevelIcon = level.icon;
                        return (
                            <li key={entry.userId} className="flex items-center gap-3 py-2.5">
                                <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                                    {i + 1}
                                </span>
                                <div className="relative shrink-0">
                                    <Avatar className={cn('h-9 w-9 border', i === 0 ? 'border-neon shadow-neon' : 'border-foreground/10')}>
                                        <AvatarImage src={entry.avatarUrl ?? undefined} />
                                        <AvatarFallback className="bg-foreground/[0.06] text-xs font-semibold text-muted-foreground">
                                            {`${entry.firstName[0] ?? ''}${entry.lastName[0] ?? ''}`.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground">
                                        <LevelIcon size={9} strokeWidth={2.5} />
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <span className="truncate">{entry.firstName} {entry.lastName}</span>
                                        {isMe && (
                                            <span className="rounded-md border border-neon/20 bg-neon/10 px-1.5 text-[10px] font-medium text-neon">
                                                Du
                                            </span>
                                        )}
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">{level.title}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold tabular-nums">{entry.count}</div>
                                    <div className="text-[11px] tabular-nums text-muted-foreground">{entry.hours} h</div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </StatCard>
    );
}
