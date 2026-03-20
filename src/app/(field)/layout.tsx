import { FieldBottomNav } from '@/components/field/field-nav'

export default function FieldLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-[100dvh] bg-slate-50 flex justify-center">
            {/* Mobile App Container Constraint */}
            <div className="w-full max-w-md bg-white min-h-[100dvh] relative shadow-lg overflow-x-hidden flex flex-col pt-14 pb-[80px]">
                
                {/* Fake Header for Branding */}
                <header className="fixed top-0 left-0 right-0 max-w-md mx-auto h-14 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-4 z-50">
                    <span className="font-bold text-xl text-teal-600 tracking-tight flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded bg-teal-600 text-white flex items-center justify-center text-sm">N</span>
                        NEXUS
                    </span>
                    <span className="ml-2 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        파트너스
                    </span>
                </header>

                <main className="flex-1 w-full bg-slate-50/50">
                    {children}
                </main>
                
                <FieldBottomNav />
            </div>
        </div>
    )
}
