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
    onConfirm: (duration: 4 | 8, notes: string) => Promise<void>;
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
    const [duration, setDuration] = useState<4 | 8>(4);
    const [notes, setNotes] = useState('');

    if (!selectedSlot) return null;

    const handleConfirm = async () => {
        try {
            await onConfirm(duration, notes);
            onClose();
            setDuration(4);
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
                        <Label htmlFor="duration">Dauer</Label>
                        <RadioGroup defaultValue="4" value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v) as 4 | 8)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="4" id="r4" />
                                <Label htmlFor="r4">4 Stunden (Standard)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="8" id="r8" />
                                <Label htmlFor="r8">8 Stunden (Doppelbuchung)</Label>
                            </div>
                        </RadioGroup>
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
