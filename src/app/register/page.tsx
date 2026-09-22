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

export default function RegisterPage() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        setIsSubmitting(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                },
            },
        });
        setIsSubmitting(false);

        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success('Registrierung erfolgreich. Bitte bestätige deine E-Mail.');
        router.replace('/login');
    };

    return (
        <AuthCard title="Registrieren" description="Erstelle deinen Account für die Ladesäule.">
            <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">Vorname</Label>
                        <Input
                            id="firstName"
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Nachname</Label>
                        <Input
                            id="lastName"
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </div>
                </div>
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
                    <Label htmlFor="password">Passwort</Label>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen.</p>
                </div>
                <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    Account erstellen
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                    Schon registriert?{' '}
                    <Link href="/login" className="text-neon hover:underline">
                        Einloggen
                    </Link>
                </p>
            </form>
        </AuthCard>
    );
}
