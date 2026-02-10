'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, User, List, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
    const pathname = usePathname();

    const links = [
        { href: "/overview", label: "Overview", icon: Home },
        { href: "/bookings", label: "My Bookings", icon: List },
        { href: "/profile", label: "Profile", icon: User },
    ];

    return (
        <aside className="hidden border-r bg-muted/40 md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
            <div className="flex flex-col h-full gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 bg-background">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <Zap className="h-6 w-6 text-primary" />
                        <span className="">Bin Laden</span>
                    </Link>
                </div>
                <div className="flex-1 px-2 py-2">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                        {links.map(({ href, label, icon: Icon }) => {
                            const isActive = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                        isActive
                                            ? "bg-muted text-primary"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </aside>
    );
}
