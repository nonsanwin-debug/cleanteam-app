'use client'

import { useState, useEffect } from 'react'
import { Sparkles, HelpCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DashboardHeader({ hideGuideButton = false }: { hideGuideButton?: boolean }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isIOS, setIsIOS] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)

    useEffect(() => {
        // Check if running in standalone PWA mode
        if (typeof window !== 'undefined') {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
                || (window.navigator as any).standalone === true
            setIsStandalone(isStandaloneMode)

            // Detect iOS device
            const userAgent = window.navigator.userAgent.toLowerCase()
            const isIpadOrIphone = /iphone|ipad|ipod/.test(userAgent)
            setIsIOS(isIpadOrIphone)
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const handleTriggerTour = () => {
        window.dispatchEvent(new CustomEvent('nexus-trigger-tour'))
    }

    const handleInstallClick = async () => {
        if (isIOS) {
            alert('아이폰(iOS)에서 홈 화면에 앱을 설치하려면:\n\n1. Safari 브라우저 하단의 [공유(네모박스에 위 화살표)] 아이콘을 누릅니다.\n2. 메뉴 목록을 아래로 내려 [홈 화면에 추가]를 선택합니다.')
            return
        }

        if (!deferredPrompt) {
            alert('앱 설치 준비 중이거나 이미 설치되어 있습니다. 크롬 등의 브라우저 주소창 우측의 설치 아이콘을 클릭하셔도 설치가 가능합니다.')
            return
        }

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log(`User response to install prompt: ${outcome}`)
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
        }
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
            
            <div className="flex shrink-0 gap-2">
                {!isStandalone && (deferredPrompt || isIOS || typeof window !== 'undefined') && (
                    <Button
                        onClick={handleInstallClick}
                        variant="outline"
                        className="h-9 px-3.5 rounded-lg border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 text-indigo-700 font-bold text-xs gap-1.5 transition-all duration-200 shadow-sm"
                    >
                        <Download className="w-4 h-4 text-indigo-600 shrink-0" />
                        바탕화면에 앱 설치
                    </Button>
                )}
                {!hideGuideButton && (
                    <Button
                        onClick={handleTriggerTour}
                        variant="outline"
                        className="h-9 px-3.5 rounded-lg border-blue-200 bg-blue-50/30 hover:bg-blue-50 text-blue-700 font-bold text-xs gap-1.5 transition-all duration-200 shadow-sm"
                    >
                        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        서비스 가이드 다시보기
                    </Button>
                )}
            </div>
        </div>
    )
}
