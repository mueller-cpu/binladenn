import { describe, it, expect } from 'vitest';
import {
    ANNOUNCEMENT_VERSION,
    hasSeenAnnouncement,
    markAnnouncementSeen,
    type KeyValueStore,
} from '@/lib/announcement';

function fakeStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
    const data = new Map(Object.entries(initial));
    return {
        data,
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => { data.set(key, value); },
    };
}

describe('Feature-Announcement', () => {
    it('wird auf einem frischen Gerät noch nicht als gesehen gewertet', () => {
        expect(hasSeenAnnouncement(fakeStore())).toBe(false);
    });

    it('ist nach dem Markieren gesehen', () => {
        const store = fakeStore();
        markAnnouncementSeen(store);
        expect(hasSeenAnnouncement(store)).toBe(true);
    });

    it('zeigt eine neue Version wieder an, wenn nur eine ältere gesehen wurde', () => {
        const store = fakeStore();
        markAnnouncementSeen(store, '2026-01-alt');
        expect(hasSeenAnnouncement(store, '2026-09-neu')).toBe(false);
    });

    it('nutzt standardmäßig die aktuelle Version', () => {
        const store = fakeStore();
        markAnnouncementSeen(store);
        expect(hasSeenAnnouncement(store, ANNOUNCEMENT_VERSION)).toBe(true);
    });

    it('gilt ohne verfügbaren Speicher als gesehen, damit es nicht bei jedem Start erscheint', () => {
        expect(hasSeenAnnouncement(null)).toBe(true);
    });

    it('ignoriert einen fehlenden Speicher beim Markieren', () => {
        expect(() => markAnnouncementSeen(null)).not.toThrow();
    });
});
