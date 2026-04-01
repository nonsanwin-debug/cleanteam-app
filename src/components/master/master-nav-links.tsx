'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, Building2, Settings, ArchiveRestore, Megaphone, MessageSquarePlus, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const NAV_ITEMS = [
    { href: '/master/dashboard', icon: LayoutDashboard, label: '대시보드', iconColor: 'text-blue-500' },
    { href: '/master/companies', icon: Building2, label: '업체 관리', iconColor: 'text-rose-500' },
    { href: '/master/users', icon: Users, label: '이용자 관리', iconColor: 'text-emerald-500' },
    { href: '/master/partners', icon: Building2, label: '파트너업체', iconColor: 'text-teal-500' },
    { href: '/master/cash-requests', icon: Wallet, label: '캐쉬 충전 관리', iconColor: 'text-cyan-500' },
    { href: '/master/ads', icon: Megaphone, label: '광고 관리', iconColor: 'text-indigo-400' },
    { href: '/master/inquiries', icon: MessageSquarePlus, label: '업체 문의 관리', iconColor: 'text-purple-500', showBadge: true },
    { href: '/master/recovery', icon: ArchiveRestore, label: '휴지통 방', iconColor: 'text-amber-500' },
    { href: '/master/settings', icon: Settings, label: '플랫폼 설정', iconColor: 'text-slate-500' },
]

export function MasterNavLinks({ pendingInquiriesCount = 0 }: { pendingInquiriesCount?: number }) {
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
                                'w-full justify-start border-l-4 mt-2 justify-between',
                                isActive
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm border-indigo-700'
                                    : 'text-slate-600 hover:text-primary hover:bg-slate-50 border-transparent hover:border-indigo-600',
                            )}
                        >
                            <span className="flex items-center">
                                <Icon className={cn(
                                    'mr-2 h-4 w-4',
                                    !isActive && item.iconColor,
                                )} />
                                {item.label}
                            </span>
                            {item.showBadge && pendingInquiriesCount > 0 && (
                                <Badge variant="destructive" className="ml-2 h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
                                    {pendingInquiriesCount}
                                </Badge>
                            )}
                        </Button>
                    </Link>
                )
            })}
        </nav>
    )
}
