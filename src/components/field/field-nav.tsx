'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ListOrdered, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { name: '홈', href: '/field/home', icon: Home },
    { name: '내 오더', href: '/field/orders', icon: ListOrdered },
    { name: '내 정보', href: '/field/profile', icon: User },
]

export function FieldBottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-white border-t border-slate-200 pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                                isActive 
                                    ? "text-teal-600" 
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                            <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>
                                {item.name}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
