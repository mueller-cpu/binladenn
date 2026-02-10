'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TimeSlot, formatDay } from '@/lib/booking-utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BookingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    selectedSlot: TimeSlot | null;
    onConfirm: (duration: number, notes: string) => Promise<void>;
    isProcessing: boolean;
}

export function BookingDialog({
    isOpen,
    onClose,
    selectedDate,
    selectedSlot,
    onConfirm,
    isProcessing
}: BookingDialogProps) {
    const [notes, setNotes] = useState('');

    if (!selectedSlot) return null;

    const handleConfirm = async () => {
        if (!selectedSlot) return;
        try {
            await onConfirm(selectedSlot.duration, notes);
            onClose();
            setNotes('');
        } catch (error) {
            // Error handling is done in parent
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Buchung erstellen</DialogTitle>
                    <DialogDescription>
                        {formatDay(selectedDate)} • {selectedSlot.label}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Dauer</Label>
                        <div className="p-2 bg-muted rounded-md text-sm">
                            {selectedSlot.duration} Stunden
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notiz (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Z.B. Kennzeichen oder Handynummer"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>Abbrechen</Button>
                    <Button onClick={handleConfirm} disabled={isProcessing}>
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Buchen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
