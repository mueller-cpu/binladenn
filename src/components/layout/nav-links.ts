import { BarChart3, CalendarDays, User, type LucideIcon } from "lucide-react";

export interface NavLink {
    href: string;
    label: string;
    icon: LucideIcon;
}

export const NAV_LINKS: NavLink[] = [
    { href: "/overview", label: "Kalender", icon: CalendarDays },
    { href: "/stats", label: "Statistik", icon: BarChart3 },
    { href: "/profile", label: "Profil", icon: User },
];

export function isNavActive(pathname: string, href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
}
