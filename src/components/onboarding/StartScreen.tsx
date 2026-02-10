"use client";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useState, useEffect } from "react";

export function StartScreen({ onStart }: { onStart: () => void }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between h-[100dvh] bg-background text-foreground p-6 overflow-hidden">
            {/* Background glow effects */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[hsl(var(--neon-green))] opacity-20 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center space-y-8 z-10 animate-in fade-in zoom-in duration-700">
                {/* Logo Construction */}
                <div className="relative">
                    <Zap className="w-24 h-24 text-[hsl(var(--neon-green))] drop-shadow-[0_0_15px_rgba(57,255,20,0.8)] fill-[hsl(var(--neon-green)/0.2)]" />
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                        BIN LADEN
                    </h1>
                    <p className="text-zinc-400 uppercase tracking-[0.2em] text-sm">
                        Ladesäule verwalten
                    </p>
                </div>
            </div>

            <div className="w-full max-w-sm z-10 pb-12 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-300 fill-mode-backwards">
                <Button
                    className="w-full h-14 text-lg font-bold bg-[hsl(var(--neon-green))] text-black hover:bg-[hsl(var(--neon-green)/0.8)] hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(57,255,20,0.4)] rounded-full"
                    onClick={onStart}
                >
                    JETZT RESERVIEREN
                </Button>
            </div>
        </div>
    );
}
