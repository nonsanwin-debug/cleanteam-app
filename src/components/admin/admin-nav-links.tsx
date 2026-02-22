'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LayoutDashboard, CheckSquare, Settings, LogOut, Users, MapPin, AlertCircle, UserPlus, Building2, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminNavLinksProps {
    pendingCount: number
}

const NAV_ITEMS = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: '대시보드' },
    { href: '/admin/sites', icon: MapPin, label: '현장 관리' },
    { href: '/admin/shared-orders', icon: Share2, label: '오더 공유' },
    { href: '/admin/checklists', icon: CheckSquare, label: '체크리스트 관리' },
    { href: '/admin/users', icon: Users, label: '사용자 관리', showBadge: true },
    { href: '/admin/as-manage', icon: AlertCircle, label: 'AS 관리' },
    { href: '/admin/logs', icon: LogOut, label: '정산 로그', iconRotate: true },
    { href: '/admin/partners', icon: Building2, label: '업체 권한 관리' },
    { href: '/admin/users/new', icon: UserPlus, label: '팀원 등록', special: true },
    { href: '/admin/settings', icon: Settings, label: '설정' },
]

export function AdminNavLinks({ pendingCount }: AdminNavLinksProps) {
    const pathname = usePathname()

    return (
        <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
                const isActive = item.href === '/admin/sites'
                    ? pathname.startsWith('/admin/sites')
                    : item.href === '/admin/users/new'
                        ? pathname === '/admin/users/new'
                        : item.href === '/admin/users'
                            ? pathname.startsWith('/admin/users') && pathname !== '/admin/users/new'
                            : pathname.startsWith(item.href)

                const Icon = item.icon

                return (
                    <Link key={item.href} href={item.href}>
                        <Button
                            variant={isActive ? 'default' : 'ghost'}
                            className={cn(
                                'w-full justify-start',
                                isActive
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                    : item.special
                                        ? 'text-slate-600 hover:text-primary hover:bg-indigo-50 border-l-4 border-transparent hover:border-indigo-600'
                                        : 'text-slate-600 hover:text-primary hover:bg-slate-50',
                            )}
                        >
                            <Icon className={cn(
                                'mr-2 h-4 w-4',
                                item.iconRotate && 'rotate-180',
                                item.special && !isActive && 'text-indigo-600',
                            )} />
                            {item.label}
                            {item.showBadge && pendingCount > 0 && (
                                <Badge className={cn(
                                    'ml-auto h-5 min-w-5 flex items-center justify-center px-1.5',
                                    isActive
                                        ? 'bg-white text-blue-600 hover:bg-white/90'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                )}>
                                    {pendingCount}
                                </Badge>
                            )}
                        </Button>
                    </Link>
                )
            })}
        </nav>
    )
}
