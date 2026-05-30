'use client'

import { Sparkles, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DashboardHeader() {
    const handleTriggerTour = () => {
        window.dispatchEvent(new CustomEvent('nexus-trigger-tour'))
    }

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold tracking-tight">대시보드</h2>
                <div className="hidden sm:flex items-center gap-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-100 rounded-full px-2.5 py-0.5 text-xs text-blue-700 font-bold">
                    <Sparkles className="w-3 h-3" />
                    <span>NEXUS 파트너용</span>
                </div>
            </div>
            
            <div className="flex shrink-0">
                <Button
                    onClick={handleTriggerTour}
                    variant="outline"
                    className="h-9 px-3.5 rounded-lg border-blue-200 bg-blue-50/30 hover:bg-blue-50 text-blue-700 font-bold text-xs gap-1.5 transition-all duration-200"
                >
                    <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    서비스 가이드 다시보기
                </Button>
            </div>
        </div>
    )
}
