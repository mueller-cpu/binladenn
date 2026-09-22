'use client';

import { usePathname } from "next/navigation";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileNav } from "./MobileNav";

/** Routen ohne Navigation: Splash und Auth. */
const BARE_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    if (BARE_ROUTES.includes(pathname)) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-dvh w-full">
            <DesktopSidebar />
            <div className="flex-1 md:pl-64">
                <main
                    key={pathname}
                    className="mx-auto w-full max-w-5xl animate-fade-in px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-12 md:pt-10"
                >
                    {children}
                </main>
            </div>
            <MobileNav />
        </div>
    );
}
