'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { validateNewPassword, MIN_PASSWORD_LENGTH } from '@/lib/password';

/**
 * Ziel des Links aus der „Passwort vergessen“-Mail. Supabase meldet den Nutzer über den
 * Link an; hier setzt er das neue Passwort. Ohne Session ist der Link ungültig oder abgelaufen.
 */
export default function ResetPasswordPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        const problem = validateNewPassword(password, confirm);
        if (problem) {
            toast.error(problem);
            return;
        }

        setIsSubmitting(true);
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            setIsSubmitting(false);
            toast.error(`Passwort konnte nicht gesetzt werden: ${error.message}`);
            return;
        }
        // Andere Geräte abmelden, das hier bleibt eingeloggt.
        await supabase.auth.signOut({ scope: 'others' });
        toast.success('Neues Passwort gespeichert.');
        router.replace('/overview');
    };

    if (isLoading) {
        return (
            <div className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={18} className="animate-spin" />
                Link wird geprüft …
            </div>
        );
    }

    if (!user) {
        return (
            <AuthCard title="Link ungültig" description="Dieser Link ist abgelaufen oder wurde schon benutzt.">
                <div className="space-y-5">
                    <div className="flex items-start gap-3 rounded-lg bg-foreground/[0.04] p-4">
                        <LinkIcon size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Links zum Zurücksetzen gelten eine Stunde und nur einmal. Fordere einfach einen neuen an.
                        </p>
                    </div>
                    <Button asChild size="lg" className="w-full">
                        <Link href="/forgot-password">Neuen Link anfordern</Link>
                    </Button>
                </div>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="Neues Passwort" description={`Für ${user.email}. Danach bist du direkt eingeloggt.`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Neues Passwort</Label>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={MIN_PASSWORD_LENGTH}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                    />
                    <p className="text-xs text-muted-foreground">Mindestens {MIN_PASSWORD_LENGTH} Zeichen.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm">Wiederholen</Label>
                    <Input
                        id="confirm"
                        type="password"
                        autoComplete="new-password"
                        minLength={MIN_PASSWORD_LENGTH}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                    />
                </div>
                <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    Passwort speichern
                </Button>
            </form>
        </AuthCard>
    );
}
