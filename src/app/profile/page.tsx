'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { ChevronRight, History, Loader2, LogOut, Upload, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { supabase } from '@/lib/supabase';
import { calculateLevel, getNextLevel } from '@/lib/gamification';
import { cn } from '@/lib/utils';

const POINTS_PER_CHARGE = 10;

interface ProfileRow {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    booking_count: number | null;
}

export default function ProfilePage() {
    const { user, isLoading: authLoading } = useRequireAuth();
    const { signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [points, setPoints] = useState(0);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!user || !supabase) return;
        const client = supabase;
        let cancelled = false;

        client
            .from('profiles')
            .select('first_name,last_name,phone,avatar_url,booking_count')
            .eq('id', user.id)
            .single()
            .then(({ data, error }) => {
                if (cancelled) return;
                if (error || !data) {
                    toast.error('Profil konnte nicht geladen werden.');
                } else {
                    const row = data as ProfileRow;
                    setFirstName(row.first_name ?? '');
                    setLastName(row.last_name ?? '');
                    setPhone(row.phone ?? '');
                    setAvatarUrl(row.avatar_url);
                    setPoints((row.booking_count ?? 0) * POINTS_PER_CHARGE);
                }
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [user]);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user || !supabase) return;
        setUploading(true);

        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;

        try {
            const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(path);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: data.publicUrl })
                .eq('id', user.id);
            if (updateError) throw updateError;

            setAvatarUrl(data.publicUrl);
            toast.success('Profilbild aktualisiert.');
        } catch (error) {
            toast.error(`Upload fehlgeschlagen: ${(error as Error).message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !supabase) return;
        setSaving(true);

        const { error } = await supabase
            .from('profiles')
            .update({ first_name: firstName, last_name: lastName, phone })
            .eq('id', user.id);

        setSaving(false);
        if (error) toast.error('Speichern fehlgeschlagen.');
        else toast.success('Profil gespeichert.');
    };

    const level = calculateLevel(points);
    const nextLevel = getNextLevel(level);
    const LevelIcon = level.icon;
    const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

    if (authLoading || loading) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[420px] rounded-xl" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-8">
            <header>
                <h1 className="font-display text-2xl uppercase tracking-wider">Profil</h1>
                <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            </header>

            <Link
                href="/stats"
                className="glass glass-hover flex items-center gap-4 rounded-xl p-4 sm:p-5"
            >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neon/10 text-neon shadow-[inset_0_0_0_1px_hsl(var(--neon)/0.15)]">
                    <LevelIcon size={22} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Dein Rang</p>
                    <p className="truncate font-display text-base uppercase tracking-wider">{level.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {points} Punkte{nextLevel ? ` · noch ${nextLevel.minPoints - points} bis „${nextLevel.title}“` : ' · Maximales Level'}
                    </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
            </Link>

            <form onSubmit={handleSave} className="glass space-y-6 rounded-xl p-5 sm:p-6">
                <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground">Persönliche Daten</h2>

                <div className="flex items-center gap-5">
                    <Avatar className="h-20 w-20 border border-foreground/10">
                        <AvatarImage src={avatarUrl ?? undefined} />
                        <AvatarFallback className="bg-foreground/[0.06] text-lg font-semibold text-muted-foreground">
                            {initials || <UserIcon size={28} strokeWidth={1.5} className="opacity-50" />}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <Button type="button" variant="outline" size="sm" className="relative" disabled={uploading}>
                            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                            Bild hochladen
                            <input
                                type="file"
                                accept="image/*"
                                aria-label="Profilbild hochladen"
                                className="absolute inset-0 cursor-pointer opacity-0"
                                onChange={handleAvatarUpload}
                                disabled={uploading}
                            />
                        </Button>
                        <p className="mt-2 text-xs text-muted-foreground">Erscheint auf deinen Buchungen im Kalender.</p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">Vorname</Label>
                        <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Nachname</Label>
                        <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Telefon <span className="text-muted-foreground">(optional)</span></Label>
                    <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Für Rückfragen an der Säule" />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="animate-spin" />}
                        Speichern
                    </Button>
                </div>
            </form>

            <section className="glass space-y-4 rounded-xl p-5 sm:p-6">
                <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground">Darstellung</h2>
                <div className="flex gap-2">
                    {mounted ? (
                        (['dark', 'light'] as const).map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setTheme(mode)}
                                className={cn(
                                    'h-9 rounded-lg px-4 text-sm font-medium transition-all duration-200',
                                    theme === mode
                                        ? 'bg-neon/10 text-neon shadow-[inset_0_0_0_1px_hsl(var(--neon)/0.2)]'
                                        : 'bg-foreground/[0.04] text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {mode === 'dark' ? 'Dunkel' : 'Hell'}
                            </button>
                        ))
                    ) : (
                        <Skeleton className="h-9 w-40" />
                    )}
                </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
                <Link
                    href="/bookings"
                    className="glass glass-hover flex items-center gap-3 rounded-xl p-4 text-sm font-medium"
                >
                    <History size={18} strokeWidth={1.75} className="text-muted-foreground" />
                    Buchungsverlauf
                    <ChevronRight size={16} className="ml-auto text-muted-foreground" />
                </Link>
                <button
                    type="button"
                    onClick={signOut}
                    className="glass glass-hover flex items-center gap-3 rounded-xl p-4 text-left text-sm font-medium text-destructive"
                >
                    <LogOut size={18} strokeWidth={1.75} />
                    Ausloggen
                </button>
            </div>
        </div>
    );
}
