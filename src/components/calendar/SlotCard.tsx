'use client';

import { format } from 'date-fns';
import { Minus, MoreHorizontal, Plus, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatTimeRange } from '@/lib/booking-utils';
import { calculateLevel } from '@/lib/gamification';
import type { SlotState } from '@/lib/slot-state';
import type { Booking, BookingProfile } from '@/lib/types';
import type { BookingActions } from '@/hooks/useBookings';

interface SlotCardProps {
    state: SlotState;
    currentUserId: string | null;
    actions: BookingActions;
    onReportRequest: (booking: Booking) => void;
}

type PillTone = 'neon' | 'danger' | 'neutral' | 'onFill';

function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
    const tones: Record<PillTone, string> = {
        neon: 'border-neon/20 bg-neon/10 text-neon',
        danger: 'border-destructive/25 bg-destructive/10 text-destructive',
        neutral: 'border-foreground/10 bg-foreground/[0.04] text-muted-foreground',
        onFill: 'border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground',
    };
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-4', tones[tone])}>
            {children}
        </span>
    );
}

function initials(profile?: BookingProfile | null): string {
    if (!profile) return '?';
    return `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?';
}

function stop(e: React.SyntheticEvent) {
    e.stopPropagation();
}

export function SlotCard({ state, currentUserId, actions, onReportRequest }: SlotCardProps) {
    const { kind, slot, booking, isPast, isRunning } = state;

    const interactive =
        (kind === 'free' && !isPast) ||
        (kind === 'own' && !isPast && !!booking);

    const handleActivate = () => {
        if (!interactive) return;
        if (kind === 'free') actions.book(state.date, slot);
        else if (kind === 'own' && booking) actions.cancel(booking);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
        }
    };

    const shell = cn(
        'relative flex min-h-[104px] flex-col justify-between rounded-xl p-4 transition-all duration-200 sm:p-5',
        interactive && 'cursor-pointer select-none active:scale-[0.99]',
        kind === 'free' && !isPast && 'glass glass-hover glass-neon',
        kind === 'free' && isPast && 'glass border-dashed opacity-50',
        kind === 'own' && 'neon-fill',
        kind === 'own' && isPast && 'opacity-60',
        kind === 'foreign' && 'glass glass-hover',
        kind === 'foreign' && booking?.charging_status === 'not_charging' && 'border-destructive/50',
        kind === 'foreign' && isPast && 'opacity-60',
    );

    const microLabel = cn(
        'text-[10px] font-medium uppercase tracking-widest',
        kind === 'own' ? 'text-primary-foreground/60' : 'text-muted-foreground',
    );

    return (
        <div
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={ariaLabel(state)}
            onClick={handleActivate}
            onKeyDown={onKeyDown}
            className={shell}
        >
            <div className="flex items-start justify-between gap-2">
                <span className={microLabel}>{slot.label}</span>
                <div className="flex items-center gap-1.5">
                    {kind === 'free' && !isPast && <Pill tone="neon">Frei</Pill>}
                    {kind === 'own' && booking?.charging_status === 'charging' && (
                        <Pill tone="onFill"><Zap size={11} strokeWidth={2.5} />Lädt</Pill>
                    )}
                    {kind === 'own' && booking?.charging_status !== 'charging' && <Pill tone="onFill">Deine Buchung</Pill>}
                    {kind === 'foreign' && booking?.charging_status === 'charging' && (
                        <Pill tone="neon"><Zap size={11} strokeWidth={2.5} />Lädt</Pill>
                    )}
                    {kind === 'foreign' && booking?.charging_status === 'not_charging' && <Pill tone="danger">Gemeldet</Pill>}
                    {kind === 'foreign' && booking?.charging_status !== 'charging' && booking?.charging_status !== 'not_charging' && (
                        <Pill tone="neutral">Belegt</Pill>
                    )}
                    {kind === 'foreign' && booking && (
                        <ForeignMenu
                            booking={booking}
                            isRunning={isRunning}
                            isPast={isPast}
                            currentUserId={currentUserId}
                            onReport={() => onReportRequest(booking)}
                            onUndoReport={() => actions.undoReport(booking)}
                        />
                    )}
                </div>
            </div>

            {kind === 'free' && <FreeBody state={state} />}
            {kind === 'own' && booking && <OwnBody state={state} booking={booking} actions={actions} />}
            {kind === 'foreign' && booking && <ForeignBody booking={booking} />}
        </div>
    );
}

function ariaLabel(state: SlotState): string {
    const range = `${state.slot.label} ${state.slot.startTime} bis ${state.slot.endTime}`;
    if (state.kind === 'free') return state.isPast ? `${range}, vorbei` : `${range}, frei. Antippen zum Buchen.`;
    if (state.kind === 'own') return state.isPast ? `${range}, deine Buchung, vorbei` : `${range}, deine Buchung. Antippen zum Löschen.`;
    const name = state.booking?.profiles?.first_name ?? 'jemand';
    return `${range}, gebucht von ${name}`;
}

function FreeBody({ state }: { state: SlotState }) {
    const shifted = state.availableFrom.getTime() !== state.start.getTime();
    if (state.isPast) {
        return (
            <div>
                <div className="text-2xl font-semibold text-muted-foreground">Vorbei</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Nicht mehr buchbar</p>
            </div>
        );
    }
    return (
        <div className="flex items-end justify-between gap-3">
            <div>
                <div className="text-2xl font-semibold tabular-nums">
                    {shifted ? `Frei ab ${format(state.availableFrom, 'HH:mm')}` : 'Frei'}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {shifted ? `Vorgänger lädt bis ${format(state.availableFrom, 'HH:mm')} · Tippen zum Buchen` : 'Tippen zum Buchen'}
                </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neon/30 text-neon">
                <Plus size={18} strokeWidth={2} />
            </div>
        </div>
    );
}

function OwnBody({ state, booking, actions }: { state: SlotState; booking: Booking; actions: BookingActions }) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const showStepper = !state.isPast && (state.canExtend || state.canShrink);
    const showCharge = !state.isPast && state.isRunning && booking.charging_status !== 'charging';

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
                <div className="text-2xl font-semibold tabular-nums">{formatTimeRange(start, end)}</div>
                <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
                    <AvatarImage src={booking.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary-foreground/15 text-xs font-semibold text-primary-foreground">
                        Du
                    </AvatarFallback>
                </Avatar>
            </div>

            {!state.isPast && (
                <div className="flex flex-wrap items-center gap-2" onClick={stop} onKeyDown={stop}>
                    {showStepper && (
                        <div className="flex items-center gap-1 rounded-lg bg-primary-foreground/10 p-0.5">
                            <StepButton
                                label="Eine Stunde kürzer"
                                disabled={!state.canShrink}
                                onClick={() => actions.extend(booking, -1)}
                            >
                                <Minus size={14} strokeWidth={2.5} />
                            </StepButton>
                            <span className="px-1 text-xs font-semibold tabular-nums text-primary-foreground">
                                Ende {format(end, 'HH:mm')}
                            </span>
                            <StepButton
                                label="Eine Stunde länger"
                                disabled={!state.canExtend}
                                onClick={() => actions.extend(booking, 1)}
                            >
                                <Plus size={14} strokeWidth={2.5} />
                            </StepButton>
                        </div>
                    )}
                    {showCharge && (
                        <button
                            type="button"
                            onClick={() => actions.confirmCharging(booking)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary-foreground/15 px-3 text-xs font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-foreground/25"
                        >
                            <Zap size={13} strokeWidth={2.5} />
                            Lade jetzt
                        </button>
                    )}
                    <span className="ml-auto hidden text-[10px] uppercase tracking-widest text-primary-foreground/50 min-[420px]:inline">
                        Antippen löscht
                    </span>
                </div>
            )}
        </div>
    );
}

function StepButton({
    label, disabled, onClick, children,
}: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground transition-colors duration-200 hover:bg-primary-foreground/15 disabled:opacity-30 disabled:hover:bg-transparent"
        >
            {children}
        </button>
    );
}

function ForeignBody({ booking }: { booking: Booking }) {
    const profile = booking.profiles;
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const level = calculateLevel((profile?.booking_count ?? 0) * 10);
    const LevelIcon = level.icon;

    return (
        <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
                <div className="truncate text-xl font-semibold">
                    {profile ? `${profile.first_name} ${profile.last_name}` : 'Unbekannt'}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatTimeRange(start, end)}</span>
                    <span className="mx-1.5 opacity-50">·</span>
                    {level.title}
                </p>
            </div>
            <div className="relative shrink-0">
                <Avatar className="h-10 w-10 border border-foreground/10">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-foreground/[0.06] text-xs font-semibold text-muted-foreground">
                        {initials(profile)}
                    </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-background bg-neon text-black">
                    <LevelIcon size={11} strokeWidth={2.5} />
                </span>
            </div>
        </div>
    );
}

function ForeignMenu({
    booking, isRunning, isPast, currentUserId, onReport, onUndoReport,
}: {
    booking: Booking;
    isRunning: boolean;
    isPast: boolean;
    currentUserId: string | null;
    onReport: () => void;
    onUndoReport: () => void;
}) {
    const reported = booking.charging_status === 'not_charging';
    const isReporter = reported && !!currentUserId && booking.reporter_id === currentUserId;
    const canReport = !reported && isRunning && !isPast;

    if (!canReport && !isReporter) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Aktionen"
                    onClick={stop}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground"
                >
                    <MoreHorizontal size={16} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={stop}>
                {canReport && (
                    <DropdownMenuItem onSelect={onReport} className="text-destructive focus:text-destructive">
                        Lädt nicht melden
                    </DropdownMenuItem>
                )}
                {isReporter && (
                    <DropdownMenuItem onSelect={onUndoReport}>
                        Meldung zurückziehen
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
