'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
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
                <h1 className="text-lg font-bold">Clean Admin</h1>
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
                        <SheetTitle className="text-left text-xl font-bold">Clean Admin</SheetTitle>
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
