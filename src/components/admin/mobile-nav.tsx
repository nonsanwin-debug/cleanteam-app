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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:hidden">
            <div>
                <Link href="/admin/dashboard" className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:opacity-80 transition-opacity">
                    <Image src="/icons/icon-192.png" alt="NEXUS" width={24} height={24} className="rounded-sm" />
                    NEXUS
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
                            <Link href="/admin/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={() => setOpen(false)}>
                                <Image src="/icons/icon-192.png" alt="NEXUS" width={28} height={28} className="rounded-md" />
                                NEXUS
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
