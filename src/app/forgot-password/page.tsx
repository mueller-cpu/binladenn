'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        setIsSubmitting(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        setIsSubmitting(false);

        if (error) {
            toast.error(error.message);
            return;
        }
        setSent(true);
    };

    return (
        <AuthCard title="Passwort vergessen" description="Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.">
            {sent ? (
                <div className="space-y-5">
                    <div className="flex items-start gap-3 rounded-lg bg-neon/10 p-4 shadow-[inset_0_0_0_1px_hsl(var(--neon)/0.15)]">
                        <MailCheck size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-neon" />
                        <p className="text-sm">
                            Wenn ein Account zu <span className="font-medium">{email}</span> existiert, ist jetzt eine E-Mail unterwegs.
                            Der Link darin ist eine Stunde gültig.
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Keine Mail bekommen? Prüf den Spam-Ordner oder frag deinen Admin.
                    </p>
                    <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-neon hover:underline">
                        <ArrowLeft size={14} />
                        Zurück zum Login
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">E-Mail</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="m.muster@firma.de"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="animate-spin" />}
                        Link schicken
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        <Link href="/login" className="text-neon hover:underline">
                            Zurück zum Login
                        </Link>
                    </p>
                </form>
            )}
        </AuthCard>
    );
}
