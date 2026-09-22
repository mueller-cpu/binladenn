'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Booking } from '@/lib/types';

interface ReportDialogProps {
    booking: Booking | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (booking: Booking) => void;
}

export function ReportDialog({ booking, open, onOpenChange, onConfirm }: ReportDialogProps) {
    const name = booking?.profiles?.first_name ?? 'Diese Person';

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="glass">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-display uppercase tracking-wider">{name} melden?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Die Buchung wird als „lädt nicht“ markiert und {name} wird für 7 Tage gesperrt.
                        Melde nur, wenn die Säule jetzt gerade nicht genutzt wird.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                        className={cn(buttonVariants({ variant: 'destructive' }), 'shadow-none')}
                        onClick={() => booking && onConfirm(booking)}
                    >
                        Melden
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
