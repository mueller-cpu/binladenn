'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, isNavActive } from "./nav-links";

export function DesktopSidebar() {
    const pathname = usePathname();

    return (
        <aside className="glass-bar fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-foreground/5 md:flex">
            <Link href="/overview" className="flex h-16 items-center gap-3 px-6">
                <Zap size={22} strokeWidth={2} className="text-neon fill-neon/20" />
                <span className="font-display text-sm uppercase tracking-[0.25em]">Bin Laden</span>
            </Link>

            <nav aria-label="Hauptnavigation" className="flex-1 space-y-1 px-3 pt-4">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                    const active = isNavActive(pathname, href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                active
                                    ? "bg-neon/10 text-neon shadow-[inset_0_0_0_1px_hsl(var(--neon)/0.1)]"
                                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                            )}
                        >
                            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-6 pb-6 text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Ladesäule buchen
            </div>
        </aside>
    );
}
