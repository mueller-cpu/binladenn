/**
 * Einmaliges Feature-Announcement. Pro Gerät gemerkt (localStorage).
 * Für ein neues Announcement die Version ändern, dann erscheint es genau einmal wieder.
 */
export const ANNOUNCEMENT_VERSION = '2026-09-one-tap';

const STORAGE_KEY = 'binladen:announcement-seen';

export interface KeyValueStore {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

/** Ohne Speicher gilt das Announcement als gesehen, damit es nicht bei jedem Start erscheint. */
export function hasSeenAnnouncement(store: KeyValueStore | null, version = ANNOUNCEMENT_VERSION): boolean {
    if (!store) return true;
    return store.getItem(STORAGE_KEY) === version;
}

export function markAnnouncementSeen(store: KeyValueStore | null, version = ANNOUNCEMENT_VERSION): void {
    store?.setItem(STORAGE_KEY, version);
}

/** localStorage kann fehlen oder werfen (Private Mode, blockierte Site-Daten). */
export function safeLocalStorage(): KeyValueStore | null {
    try {
        if (typeof window === 'undefined') return null;
        const probe = '__binladen_probe__';
        window.localStorage.setItem(probe, '1');
        window.localStorage.removeItem(probe);
        return window.localStorage;
    } catch {
        return null;
    }
}
