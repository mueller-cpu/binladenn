'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, User, List } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
    const pathname = usePathname();

    const links = [
        { href: "/overview", label: "Home", icon: Home },
        { href: "/bookings", label: "My Bookings", icon: List },
        { href: "/profile", label: "Profile", icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg md:hidden">
            <div className="flex items-center justify-around h-16">
                {links.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="w-5 h-5 mb-1" />
                            {label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
