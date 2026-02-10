'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Upload, User as UserIcon } from 'lucide-react';
import { Toaster } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { calculateLevel, getNextLevel, Level } from '@/lib/gamification';

export default function ProfilePage() {
    const { user, isLoading: authLoading, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Gamification State
    const [points, setPoints] = useState(0);
    const [level, setLevel] = useState<Level | null>(null);
    const [nextLevel, setNextLevel] = useState<Level | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }

        if (user && supabase) {
            fetchProfile();
            fetchGamificationStats();
        }
    }, [user, authLoading, router]);

    const fetchProfile = async () => {
        if (!user || !supabase) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            toast.error("Profil konnte nicht geladen werden.");
            console.error(error);
        } else {
            setFirstName(data.first_name || '');
            setLastName(data.last_name || '');
            setPhone(data.phone || '');
            setAvatarUrl(data.avatar_url || null);
        }
        setLoading(false);
    };

    const fetchGamificationStats = async () => {
        if (!user || !supabase) return;

        // Count COMPLETED bookings (in the past)
        const now = new Date().toISOString();
        const { count, error } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'active')
            .lt('end_time', now);

        if (!error && count !== null) {
            const calculatedPoints = count * 10;
            setPoints(calculatedPoints);
            const currentLevel = calculateLevel(calculatedPoints);
            setLevel(currentLevel);
            setNextLevel(getNextLevel(currentLevel));
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !user || !supabase) {
            return;
        }
        setUploading(true);
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            const publicUrl = data.publicUrl;

            // Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            toast.success("Profilbild aktualisiert!");
        } catch (error: any) {
            toast.error("Upload fehlgeschlagen: " + error.message);
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
            .update({
                first_name: firstName,
                last_name: lastName,
                phone: phone,
            })
            .eq('id', user.id);

        if (error) {
            toast.error("Fehler beim Speichern.");
        } else {
            toast.success("Profil gespeichert!");
        }
        setSaving(false);
    };

    if (authLoading || loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container max-w-2xl py-6 space-y-6">
            <Toaster position="top-center" />
            <h1 className="text-3xl font-bold">Mein Profil</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Persönliche Daten</CardTitle>
                </CardHeader>
                <form onSubmit={handleSave}>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={avatarUrl || ''} />
                                    <AvatarFallback><UserIcon className="h-10 w-10 opacity-50" /></AvatarFallback>
                                </Avatar>
                                {level && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                                                <level.icon className="h-5 w-5" />
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    <level.icon className="h-6 w-6 text-primary" />
                                                    {level.title}
                                                </DialogTitle>
                                                <DialogDescription>
                                                    {level.description}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4 space-y-4">
                                                <div className="flex justify-between text-sm font-medium">
                                                    <span>{points} Punkte</span>
                                                    {nextLevel && <span>Ziel: {nextLevel.minPoints}</span>}
                                                </div>
                                                {nextLevel && (
                                                    <Progress value={((points - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100} />
                                                )}
                                                {!nextLevel && <p className="text-sm text-center text-muted-foreground">Maximales Level erreicht!</p>}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>

                            {level && (
                                <div className="text-center -mt-2">
                                    <p className="font-bold text-lg">{level.title}</p>
                                    <p className="text-xs text-muted-foreground">{points} Punkte</p>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" className="relative cursor-pointer" disabled={uploading}>
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                    Bild hochladen
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleAvatarUpload}
                                        disabled={uploading}
                                    />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">Vorname</Label>
                                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Nachname</Label>
                                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-Mail</Label>
                            <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefon (Optional)</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className="pt-4 border-t">
                            <Label className="text-base font-semibold mb-2 block">Aussehen</Label>
                            <div className="flex items-center gap-2 mt-2">
                                {mounted ? (
                                    <>
                                        <Button
                                            type="button"
                                            variant={theme === 'light' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setTheme('light')}
                                        >
                                            Hell
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={theme === 'dark' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setTheme('dark')}
                                        >
                                            Dunkel
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={theme === 'system' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setTheme('system')}
                                        >
                                            System
                                        </Button>
                                    </>
                                ) : (
                                    <div className="h-9 w-48 bg-muted animate-pulse rounded-md" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="button" variant="destructive" onClick={signOut}>Ausloggen</Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Speichern
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
