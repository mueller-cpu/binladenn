'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_LINKS, isNavActive } from "./nav-links";

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Hauptnavigation"
            className="glass-bar pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-foreground/5 md:hidden"
        >
            <div className="flex h-16 items-stretch justify-around px-2">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                    const active = isNavActive(pathname, href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-200",
                                active ? "text-neon" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {active && (
                                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-neon shadow-neon" />
                            )}
                            <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                            {label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
