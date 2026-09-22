'use client';

import { useRef } from 'react';

/**
 * Horizontale Wischgeste. Vertikales Scrollen bleibt unangetastet:
 * ausgelöst wird nur, wenn die Bewegung klar horizontal ist.
 */
export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 60) {
    const startX = useRef<number | null>(null);
    const startY = useRef<number | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        if (startX.current === null || startY.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        const dy = e.changedTouches[0].clientY - startY.current;
        startX.current = null;
        startY.current = null;

        if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0) onSwipeLeft();
        else onSwipeRight();
    };

    return { onTouchStart, onTouchEnd };
}
