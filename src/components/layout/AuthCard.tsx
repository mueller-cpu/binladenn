import Link from "next/link";
import { Zap } from "lucide-react";

interface AuthCardProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

/** Rahmen für Login und Registrierung: Marke oben, Glaskarte darunter. */
export function AuthCard({ title, description, children }: AuthCardProps) {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
            <Link href="/" className="mb-8 flex items-center gap-3 text-foreground">
                <Zap size={24} strokeWidth={2} className="text-neon" fill="hsl(var(--neon) / 0.2)" />
                <span className="font-display text-base uppercase tracking-[0.25em]">Bin Laden</span>
            </Link>
            <div className="glass w-full max-w-md animate-fade-in rounded-xl p-6 sm:p-8">
                <h1 className="font-display text-2xl uppercase tracking-wider">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                <div className="mt-6">{children}</div>
            </div>
        </div>
    );
}
