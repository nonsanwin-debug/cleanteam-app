'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, Building2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
    { href: '/master/dashboard', icon: LayoutDashboard, label: '대시보드', iconColor: 'text-blue-500' },
    { href: '/master/companies', icon: Building2, label: '업체 관리', iconColor: 'text-rose-500' },
    { href: '/master/users', icon: Users, label: '이용자 관리', iconColor: 'text-emerald-500' },
    { href: '/master/settings', icon: Settings, label: '플랫폼 설정', iconColor: 'text-slate-500' },
]

export function MasterNavLinks() {
    const pathname = usePathname()

    return (
        <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                    <Link key={item.href} href={item.href}>
                        <Button
                            variant={isActive ? 'default' : 'ghost'}
                            className={cn(
                                'w-full justify-start border-l-4 mt-2',
                                isActive
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm border-indigo-700'
                                    : 'text-slate-600 hover:text-primary hover:bg-slate-50 border-transparent hover:border-indigo-600',
                            )}
                        >
                            <Icon className={cn(
                                'mr-2 h-4 w-4',
                                !isActive && item.iconColor,
                            )} />
                            {item.label}
                        </Button>
                    </Link>
                )
            })}
        </nav>
    )
}
