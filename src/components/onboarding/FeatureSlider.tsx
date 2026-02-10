"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, ShieldAlert, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
    {
        id: 1,
        icon: Calendar,
        title: "Einfach Buchen",
        description: "Reserviere Slots für dein E-Fahrzeug in Sekunden. Keine Wartezeiten mehr."
    },
    {
        id: 2,
        icon: Eye,
        title: "Alles im Blick",
        description: "Coole Übersicht über alle Buchungen. Fahr nie wieder umsonst zur Säule."
    },
    {
        id: 3,
        icon: ShieldAlert,
        title: "Fairness First",
        description: "Wer bucht und nicht lädt, wird für 7 Tage gesperrt. Melde Missbrauch direkt in der App."
    }
];

export function FeatureSlider({ onComplete }: { onComplete: () => void }) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(curr => curr + 1);
        } else {
            onComplete();
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-background text-foreground relative overflow-hidden">
            {/* Skip logic */}
            <div className="absolute top-4 right-4 z-20">
                <Button variant="ghost" onClick={onComplete} className="text-muted-foreground hover:text-foreground">
                    Überspringen
                </Button>
            </div>

            <div className="flex-1 flex flex-col relative">
                {/* Slides Container */}
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                    <div key={SLIDES[currentSlide].id} className="animate-in fade-in slide-in-from-right-8 duration-300 flex flex-col items-center gap-6 max-w-md">
                        <div className="w-24 h-24 rounded-3xl bg-[hsl(var(--neon-green)/0.1)] flex items-center justify-center mb-4 ring-1 ring-[hsl(var(--neon-green)/0.2)] shadow-[0_0_30px_hsl(var(--neon-green)/0.15)]">
                            {/* Dynamic Icon Component */}
                            {(() => {
                                const Icon = SLIDES[currentSlide].icon;
                                return <Icon className="w-12 h-12 text-[hsl(var(--neon-green))]" />;
                            })()}
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            {SLIDES[currentSlide].title}
                        </h2>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            {SLIDES[currentSlide].description}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-8 flex flex-col gap-8 pb-12">
                    {/* Dots */}
                    <div className="flex justify-center gap-2">
                        {SLIDES.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-300",
                                    idx === currentSlide ? "bg-[hsl(var(--neon-green))] w-8" : "bg-muted w-2"
                                )}
                            />
                        ))}
                    </div>

                    <Button
                        onClick={nextSlide}
                        className="w-full h-14 text-lg font-bold rounded-xl"
                        size="lg"
                    >
                        {currentSlide === SLIDES.length - 1 ? "Los geht's" : "Weiter"}
                        {currentSlide !== SLIDES.length - 1 && <ChevronRight className="ml-2 w-5 h-5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
