import { describe, it, expect } from 'vitest';
import { validateNewPassword, MIN_PASSWORD_LENGTH } from '@/lib/password';

describe('validateNewPassword', () => {
    it('akzeptiert ein passendes Passwort mit Mindestlänge', () => {
        expect(validateNewPassword('sonnenblume8', 'sonnenblume8')).toBeNull();
    });

    it('lehnt zu kurze Passwörter ab und nennt die Mindestlänge', () => {
        expect(validateNewPassword('kurz', 'kurz')).toBe(`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
    });

    it('lehnt nicht übereinstimmende Wiederholung ab', () => {
        expect(validateNewPassword('sonnenblume8', 'sonnenblume9')).toBe('Die Passwörter stimmen nicht überein.');
    });

    it('ignoriert Leerzeichen am Rand nicht, sondern wertet sie als Teil des Passworts', () => {
        expect(validateNewPassword('sonnenblume8 ', 'sonnenblume8')).toBe('Die Passwörter stimmen nicht überein.');
    });

    it('prüft die Länge vor der Übereinstimmung', () => {
        expect(validateNewPassword('kurz', 'anders')).toBe(`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
    });
});
