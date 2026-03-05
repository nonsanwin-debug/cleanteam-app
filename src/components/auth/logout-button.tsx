'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, Loader2 } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
    variant?: 'outline' | 'ghost' | 'default'
    className?: string
    showText?: boolean
    iconOnly?: boolean
    redirectTo?: string
}

export function LogoutButton({
    variant = 'outline',
    className,
    showText = true,
    iconOnly = false,
    redirectTo = '/auth/login'
}: LogoutButtonProps) {
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    async function handleLogout() {
        if (!confirm('로그아웃 하시겠습니까?')) return
        setIsPending(true)
        try {
            await signOut()
        } catch (error) {
            console.error(error)
        } finally {
            router.push(redirectTo)
            router.refresh()
            setIsPending(false)
        }
    }

    return (
        <Button
            variant={variant}
            className={cn(className, isPending && "opacity-70")}
            onClick={handleLogout}
            disabled={isPending}
        >
            {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <LogOut className={cn("h-4 w-4", showText && !iconOnly && "mr-2")} />
            )}
            {showText && !iconOnly && !isPending && "로그아웃"}
            {isPending && showText && !iconOnly && " 처리 중..."}
        </Button>
    )
}
