'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from 'lucide-react'

interface MobileNavProps {
    displayName: string
    children: React.ReactNode
}

export function MobileNav({ displayName, children }: MobileNavProps) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    // Close menu on navigation
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    return (
        <header 
            className="bg-white border-b border-slate-200 flex items-center justify-between px-6 md:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(4rem + env(safe-area-inset-top))' }}
        >
            <div>
                <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-lg font-black tracking-tighter text-slate-900 hover:opacity-80 transition-opacity">
                    <svg viewBox="0 0 24 24" fill="none" className="w-[24px] h-[24px]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="mob-nav-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#4F46E5" />
                                <stop offset="100%" stopColor="#22D3EE" />
                            </linearGradient>
                            <linearGradient id="mob-nav-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#22D3EE" />
                                <stop offset="100%" stopColor="#10B981" />
                            </linearGradient>
                            <linearGradient id="mob-nav-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#BEF264" />
                            </linearGradient>
                        </defs>
                        <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#mob-nav-1)" />
                        <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#mob-nav-3)" />
                        <path d="M5.25 4.75L18.75 19.25" stroke="url(#mob-nav-2)" strokeWidth="5.5" strokeLinecap="round" />
                    </svg>
                    <span className="pt-0.5">NEXUS</span>
                </Link>
                <p className="text-xs text-primary">{displayName}님</p>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[80%] sm:w-[385px] p-0">
                    <SheetHeader className="p-6 border-b">
                        <SheetTitle className="text-left text-xl font-bold flex items-center gap-2">
                            <Link href="/admin/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity tracking-tighter" onClick={() => setOpen(false)}>
                                <svg viewBox="0 0 24 24" fill="none" className="w-[28px] h-[28px]" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="mob-menu-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                            <stop offset="0%" stopColor="#4F46E5" />
                                            <stop offset="100%" stopColor="#22D3EE" />
                                        </linearGradient>
                                        <linearGradient id="mob-menu-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#22D3EE" />
                                            <stop offset="100%" stopColor="#10B981" />
                                        </linearGradient>
                                        <linearGradient id="mob-menu-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                            <stop offset="0%" stopColor="#10B981" />
                                            <stop offset="100%" stopColor="#BEF264" />
                                        </linearGradient>
                                    </defs>
                                    <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#mob-menu-1)" />
                                    <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#mob-menu-3)" />
                                    <path d="M5.25 4.75L18.75 19.25" stroke="url(#mob-menu-2)" strokeWidth="5.5" strokeLinecap="round" />
                                </svg>
                                <span className="pt-1">NEXUS</span>
                            </Link>
                        </SheetTitle>
                        <div className="mt-2 space-y-1 text-left">
                            <p className="text-sm font-semibold text-primary">{displayName}님 반갑습니다</p>
                        </div>
                    </SheetHeader>
                    {children}
                </SheetContent>
            </Sheet>
        </header>
    )
}
