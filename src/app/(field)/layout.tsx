import { FieldBottomNav } from '@/components/field/field-nav'
import { InstallButton } from '@/components/field/install-button'

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
                    <span className="font-black text-xl text-slate-900 tracking-tighter flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="field-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#4F46E5" />
                                    <stop offset="100%" stopColor="#22D3EE" />
                                </linearGradient>
                                <linearGradient id="field-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#22D3EE" />
                                    <stop offset="100%" stopColor="#10B981" />
                                </linearGradient>
                                <linearGradient id="field-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#10B981" />
                                    <stop offset="100%" stopColor="#BEF264" />
                                </linearGradient>
                            </defs>
                            <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#field-grad-1)" />
                            <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#field-grad-3)" />
                            <path d="M5.25 4.75L18.75 19.25" stroke="url(#field-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                        </svg>
                        <span className="pt-0.5">NEXUS</span>
                    </span>
                    <span className="ml-2 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        파트너스
                    </span>
                    <a href="tel:1644-4354" className="ml-auto text-xs font-medium text-slate-500 mr-2">1644-4354</a>
                    <InstallButton />
                </header>

                <main className="flex-1 w-full bg-slate-50/50 flex flex-col">
                    <div className="flex-1">
                        {children}
                    </div>
                    
                    {/* Legal Notice */}
                    <div className="w-full text-center text-[10px] text-slate-400/70 py-6 mt-4">
                        본 플랫폼은 통신판매중개자이며 서비스의 당사자가 아닙니다.
                    </div>
                </main>
                
                <FieldBottomNav />
            </div>
        </div>
    )
}
