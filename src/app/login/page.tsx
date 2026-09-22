'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/layout/AuthCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/overview');
        }
    }, [isLoading, user, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        setIsSubmitting(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setIsSubmitting(false);

        if (error) {
            toast.error(error.message);
            return;
        }
        router.replace('/overview');
    };

    return (
        <AuthCard title="Login" description="Melde dich an, um Ladezeiten zu buchen.">
            <form onSubmit={handleLogin} className="space-y-4">
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
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Passwort</Label>
                        <Link href="/forgot-password" className="text-xs text-neon hover:underline">
                            Passwort vergessen?
                        </Link>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    Einloggen
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                    Noch kein Account?{' '}
                    <Link href="/register" className="text-neon hover:underline">
                        Registrieren
                    </Link>
                </p>
            </form>
        </AuthCard>
    );
}
