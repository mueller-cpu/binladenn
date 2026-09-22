'use client';

import { BarChart3, MoreHorizontal, Plus, Pointer, Sparkles, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WhatsNewDialogProps {
    open: boolean;
    onClose: () => void;
}

const ITEMS: { icon: LucideIcon; title: string; text: string }[] = [
    {
        icon: Pointer,
        title: 'Ein Tipp bucht, ein zweiter löscht.',
        text: 'Kein Dialog mehr. Nach dem Löschen hast du fünf Sekunden für „Rückgängig“.',
    },
    {
        icon: Plus,
        title: 'Länger laden',
        text: 'Das Plus auf deiner Buchung verlängert um bis zu zwei Stunden, wenn der nächste Slot frei ist.',
    },
    {
        icon: BarChart3,
        title: 'Neu: Statistik',
        text: 'Wann die Säule frei ist, wer am meisten lädt und wie dein Rang steht.',
    },
    {
        icon: MoreHorizontal,
        title: 'Melden nur, wenn es läuft',
        text: 'Über das Drei-Punkte-Menü einer laufenden Buchung. Der Gemeldete wird 7 Tage gesperrt.',
    },
];

/** Einmalige Karte nach dem Update. Wegtippen oder „Verstanden“ schließt sie für dieses Gerät. */
export function WhatsNewDialog({ open, onClose }: WhatsNewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose(); }}>
            <DialogContent className="glass max-w-md gap-0 p-0 sm:rounded-xl">
                <DialogHeader className="space-y-3 p-6 pb-4 text-left">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neon/10 text-neon shadow-[inset_0_0_0_1px_hsl(var(--neon)/0.15)]">
                        <Sparkles size={20} strokeWidth={1.75} />
                    </div>
                    <DialogTitle className="font-display text-xl uppercase tracking-wider">Neu in Bin Laden</DialogTitle>
                    <DialogDescription>Die App bedient sich jetzt in einem Tipp. Das Wichtigste in Kürze:</DialogDescription>
                </DialogHeader>

                <ul className="space-y-4 px-6 pb-6">
                    {ITEMS.map(({ icon: Icon, title, text }) => (
                        <li key={title} className="flex gap-3">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05] text-neon">
                                <Icon size={16} strokeWidth={2} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold leading-tight">{title}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
                            </div>
                        </li>
                    ))}
                </ul>

                <div className="border-t border-foreground/[0.06] p-4">
                    <Button size="lg" className="w-full" onClick={onClose}>
                        Verstanden
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
