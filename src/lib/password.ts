export const MIN_PASSWORD_LENGTH = 8;

/** Liefert eine deutsche Fehlermeldung oder null, wenn das neue Passwort gültig ist. */
export function validateNewPassword(password: string, confirm: string): string | null {
    if (password.length < MIN_PASSWORD_LENGTH) return `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`;
    if (password !== confirm) return 'Die Passwörter stimmen nicht überein.';
    return null;
}
