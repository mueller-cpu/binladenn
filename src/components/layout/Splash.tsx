import { Zap } from "lucide-react";

/** Markenmoment beim Start: Blitz, Glow, Wortmarke. Immer dunkel, unabhängig vom Theme. */
export function Splash() {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#060809] text-[#ededed]">
            <div
                aria-hidden
                className="absolute h-72 w-72 rounded-full bg-[#22ff00]/25 blur-[120px] animate-splash-glow"
            />
            <Zap
                size={96}
                strokeWidth={1.5}
                className="relative animate-splash-pop text-[#22ff00] drop-shadow-[0_0_24px_rgba(34,255,0,0.6)]"
                fill="rgba(34,255,0,0.2)"
            />
            <h1 className="relative mt-8 animate-fade-in font-display text-4xl uppercase tracking-[0.3em] [animation-delay:250ms]">
                Bin Laden
            </h1>
            <p className="relative mt-3 animate-fade-in text-xs uppercase tracking-[0.25em] text-[#90989c] [animation-delay:400ms]">
                Ladesäule buchen
            </p>
        </div>
    );
}
