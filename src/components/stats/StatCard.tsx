import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

export function StatCard({ title, subtitle, action, className, children }: StatCardProps) {
    return (
        <section className={cn('glass flex flex-col rounded-xl p-5 sm:p-6', className)}>
            <header className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-xs text-muted-foreground/80">{subtitle}</p>}
                </div>
                {action}
            </header>
            <div className="flex-1">{children}</div>
        </section>
    );
}
