'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
    X, 
    Building2, 
    UserPlus, 
    Users, 
    Share2, 
    Inbox, 
    ChevronLeft, 
    ChevronRight, 
    Sparkles, 
    CheckCircle2,
    Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const CHAPTERS = [
    {
        id: 'register_nav',
        title: '현장 추가 방법 (1/2)',
        targetId: 'nav-sites',
        icon: Building2,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/dashboard',
        steps: [
            '왼쪽 메뉴에서 [현장 관리] 메뉴를 누르세요.',
            '메뉴 버튼을 클릭하거나 [다음 지시] 버튼을 클릭하면 현장 관리 화면으로 자동 연동 및 이동됩니다.'
        ],
        tip: '현장 관리 메뉴는 달력 일정 생성, 담당자 지정 및 오더 이관 등 핵심 업무의 중심지입니다.'
    },
    {
        id: 'register_action',
        title: '현장 추가 방법 (2/2)',
        targetId: 'btn-add-site',
        icon: Building2,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '현장 관리 목록 페이지에 진입했습니다.',
            '우측 상단에 밝게 빛나는 [현장 추가] 버튼을 직접 눌러 보세요.',
            '주소, 청소 날짜, 작업 종류를 적는 상세 정보 등록 창이 화면에 열립니다.'
        ],
        tip: '오더 주소와 청소 일자를 정확히 적으셔야 모바일 앱 지도 경로와 요원 정산이 올바르게 꼬이지 않고 연동됩니다.'
    },
    {
        id: 'workers_nav',
        title: '팀장/팀원 생성 (1/2)',
        targetId: 'nav-users',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/sites',
        steps: [
            '다음으로 현장 실무자를 등록해 볼까요?',
            '왼쪽 사이드바의 [사용자 관리] 메뉴 버튼을 클릭하여 이동하세요.'
        ],
        tip: '사용자 관리를 터치하거나 [다음 지시]를 누르면 사용자 관리 및 정산 대시보드로 자동 이동됩니다.'
    },
    {
        id: 'workers_action',
        title: '팀장/팀원 생성 (2/2)',
        targetId: 'btn-add-worker',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users',
        steps: [
            '요원 목록과 정산 내역이 표시되는 사용자 화면입니다.',
            '우측 상단의 [새 팀원 추가] 버튼을 클릭해 보세요.',
            '이름, 전화번호 및 역할(팀장/팀원)과 요원 로그인 비밀번호를 생성해 등록합니다.'
        ],
        tip: '등록 후 비밀번호를 실제 팀장/팀원 요원분께 전달하여 스마트폰 NEXUS 모바일 앱으로 출퇴근 서명을 하도록 안내해 주세요.'
    },
    {
        id: 'assignment_nav',
        title: '현장 요원 배정 (1/2)',
        targetId: 'nav-sites',
        icon: Users,
        color: 'bg-rose-600',
        textColor: 'text-rose-600',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-100',
        expectedPath: '/admin/users',
        steps: [
            '팀원 생성을 마쳤다면 현장에 인력을 투입해 일정 지시를 보낼 차례입니다.',
            '왼쪽 사이드바의 [현장 관리] 메뉴를 다시 클릭하세요.'
        ],
        tip: '현장 관리 화면으로 돌아가서 드래그 앤 드롭으로 배정하는 신기한 스킬을 안내해 드리겠습니다.'
    },
    {
        id: 'assignment_action',
        title: '현장 요원 배정 (2/2)',
        targetId: 'nav-sites',
        icon: Users,
        color: 'bg-rose-600',
        textColor: 'text-rose-600',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-100',
        expectedPath: '/admin/sites',
        steps: [
            '현장 관리 화면으로 복귀했습니다.',
            '각 카드 중앙의 [담당 팀장] 드롭다운에서 메인 현장 관리자를 지정하세요.',
            '하단 배지 영역에서 일반 팀원들을 마우스로 끌어 [드래그 앤 드롭]하여 카드 위로 떨어뜨려 스마트하게 배정합니다.'
        ],
        tip: '모바일 환경에서는 배정할 팀원 배지를 먼저 가볍게 원터치 선택 후, 가고자 하는 현장 카드를 터치해 주시면 배정이 마무리됩니다.'
    },
    {
        id: 'sharing',
        title: '오더 공유하기 (이관)',
        targetId: 'nav-sites',
        icon: Share2,
        color: 'bg-emerald-600',
        textColor: 'text-emerald-600',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        expectedPath: '/admin/sites',
        steps: [
            '일정이 중복되거나 거리가 먼 현장을 제휴 파트너에게 손쉽게 외주 주는 기능입니다.',
            '현장 카드 우측 상단의 [세 점(더보기)] 버튼을 눌러 [오더 공유]를 클릭하세요.',
            '상대방의 업체명#코드(예: 클린체크#1234)를 검증하고 전송 시 실시간 이관 완료됩니다.'
        ],
        tip: '이관 즉시 원래의 카드는 중복 조작 방지를 위해 "읽기 전용"으로 바뀌어 정산 오차를 철저히 방지합니다.'
    },
    {
        id: 'receiving',
        title: '공유 오더 수락/받기',
        targetId: 'nav-shared-orders',
        icon: Inbox,
        color: 'bg-orange-600',
        textColor: 'text-orange-600',
        badgeBg: 'bg-orange-50 text-orange-700 border-orange-100',
        expectedPath: '/admin/sites',
        steps: [
            '마지막으로 타사가 넘긴 알짜 오더를 수락해 매출을 늘려 볼까요?',
            '왼쪽 사이드바의 [오더 공유 센터] 메뉴 버튼을 클릭하여 이동하세요.'
        ],
        tip: '오더 공유 센터의 [받은 공유 오더 (incoming)] 탭에서 보낸 제안들을 살펴보고 [오더 수락하기]를 클릭하면 내 현장으로 즉시 이관됩니다.'
    }
]

interface OnboardingTourModalProps {
    isNewUser?: boolean
}

export function OnboardingTourModal({ isNewUser }: OnboardingTourModalProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [isMobileFallback, setIsMobileFallback] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    // Handle single-tone trigger event globally
    useEffect(() => {
        const handleTrigger = () => {
            setIsOpen(true)
            setCurrentStep(0)
            localStorage.removeItem('nexus_admin_onboarding_completed')
        }
        window.addEventListener('nexus-trigger-tour', handleTrigger)
        return () => window.removeEventListener('nexus-trigger-tour', handleTrigger)
    }, [])

    // Auto open logic on first dashboard mount only: ONLY FOR NEW USERS!
    // Set completed instantly upon first auto-open so it NEVER auto-opens again
    useEffect(() => {
        if (!isOpen && isNewUser) {
            const isCompleted = localStorage.getItem('nexus_admin_onboarding_completed')
            if (isCompleted !== 'true' && pathname === '/admin/dashboard') {
                setIsOpen(true)
                localStorage.setItem('nexus_admin_onboarding_completed', 'true')
            }
        }
    }, [pathname, isNewUser, isOpen])

    // Auto-advance step index based on path change (Active Multi-Page navigation tracking)
    useEffect(() => {
        if (!isOpen) return

        if (currentStep === 0 && pathname.startsWith('/admin/sites')) {
            setCurrentStep(1)
        } else if (currentStep === 2 && pathname.startsWith('/admin/users')) {
            setCurrentStep(3)
        } else if (currentStep === 4 && pathname.startsWith('/admin/sites')) {
            setCurrentStep(5)
        } else if (currentStep === 7 && pathname.startsWith('/admin/shared-orders')) {
            // Already navigated to shared orders, stay or allow manual complete
        }
    }, [pathname, isOpen, currentStep])

    // Track element position in real-time
    useEffect(() => {
        if (!isOpen) return

        const updatePosition = () => {
            const targetId = CHAPTERS[currentStep].targetId
            const element = document.getElementById(targetId)
            
            if (element) {
                const rect = element.getBoundingClientRect()
                if (rect.width === 0 || rect.height === 0 || rect.left < 0 || rect.top < 0 || window.innerWidth < 768) {
                    setIsMobileFallback(true)
                    setTargetRect(null)
                } else {
                    setIsMobileFallback(false)
                    setTargetRect(rect)
                }
            } else {
                setIsMobileFallback(true)
                setTargetRect(null)
            }
        }

        updatePosition()

        const intervalId = setInterval(updatePosition, 200)
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)

        return () => {
            clearInterval(intervalId)
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [isOpen, currentStep])

    const handleClose = (dontShowAgain: boolean) => {
        if (dontShowAgain) {
            localStorage.setItem('nexus_admin_onboarding_completed', 'true')
        }
        setIsOpen(false)
    }

    const handleNext = () => {
        const nextStep = currentStep + 1
        if (nextStep < CHAPTERS.length) {
            const nextChapter = CHAPTERS[nextStep]
            
            // Programmatically navigate users if they are on a different page and clicked next!
            if (nextChapter.expectedPath && !pathname.startsWith(nextChapter.expectedPath)) {
                router.push(nextChapter.expectedPath)
            }
            setCurrentStep(nextStep)
        } else {
            handleClose(true)
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            const prevStep = currentStep - 1
            const prevChapter = CHAPTERS[prevStep]
            
            // Go back in navigation if they choose previous
            if (prevChapter.expectedPath && !pathname.startsWith(prevChapter.expectedPath)) {
                router.push(prevChapter.expectedPath)
            }
            setCurrentStep(prevStep)
        }
    }

    const currentChapter = CHAPTERS[currentStep]
    const IconComponent = currentChapter.icon

    if (!isOpen) return null

    // Compute float tooltip style matching spotlight rect
    const getTooltipStyle = () => {
        if (isMobileFallback || !targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                position: 'fixed' as const,
                width: 'min(92vw, 360px)',
                zIndex: 51
            }
        }

        const width = 350
        const height = 400
        const margin = 16

        // 1. If highlighted element is on the left half of the screen, place tooltip to the right of it
        const spaceOnRight = window.innerWidth - targetRect.right
        if (spaceOnRight > width + margin + 10) {
            return {
                top: Math.min(
                    window.innerHeight - height - margin, 
                    Math.max(margin, targetRect.top + (targetRect.height / 2) - (height / 2))
                ),
                left: targetRect.right + 16,
                position: 'fixed' as const,
                width: `${width}px`,
                zIndex: 51
            }
        }

        // 2. If highlighted element is on the right half of the screen, place tooltip to the left of it (avoid overflow)
        const spaceOnLeft = targetRect.left
        if (spaceOnLeft > width + margin + 10) {
            return {
                top: Math.min(
                    window.innerHeight - height - margin,
                    Math.max(margin, targetRect.top + (targetRect.height / 2) - (height / 2))
                ),
                left: targetRect.left - width - 16,
                position: 'fixed' as const,
                width: `${width}px`,
                zIndex: 51
            }
        }

        // 3. Fallback: place below the target, clamping left & top to keep it fully visible inside viewport
        const idealLeft = targetRect.left + (targetRect.width / 2) - (width / 2)
        const clampedLeft = Math.max(margin, Math.min(window.innerWidth - width - margin, idealLeft))
        
        const idealTop = targetRect.bottom + 16
        const clampedTop = Math.max(margin, Math.min(window.innerHeight - height - margin, idealTop))

        return {
            top: clampedTop,
            left: clampedLeft,
            position: 'fixed' as const,
            width: `${width}px`,
            zIndex: 51
        }
    }

    const tooltipStyle = getTooltipStyle()

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden select-none">
            {/* Backdrop Mask */}
            {/* Set pointer-events-none so click-through works exactly inside the target ring! */}
            <div 
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-[0.5px] transition-opacity duration-300 pointer-events-auto"
                onClick={() => handleClose(false)}
            />

            {/* Spotlight Highlight Element with pointer-events-none inside but letting click-through onto standard DOM */}
            {targetRect && !isMobileFallback && (
                <div 
                    className="fixed z-50 rounded-xl border-3 border-blue-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] pointer-events-none transition-all duration-300 ease-out"
                    style={{
                        top: targetRect.top - 6,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 12,
                    }}
                >
                    {/* Glowing pulse ring */}
                    <div className="absolute -inset-1 rounded-xl border border-blue-400/50 animate-ping opacity-75 pointer-events-none" />
                </div>
            )}

            {/* Click-through Area Helper for desktop: Tells them they can click directly or click the next button */}
            {targetRect && !isMobileFallback && (
                <div 
                    className="fixed z-50 cursor-pointer pointer-events-auto opacity-0"
                    title="여기를 직접 클릭하여 동작할 수 있습니다."
                    style={{
                        top: targetRect.top - 6,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 12,
                    }}
                    onClick={() => {
                        // Triggers the click on the actual DOM element
                        const element = document.getElementById(currentChapter.targetId)
                        if (element) {
                            element.click()
                        }
                    }}
                />
            )}

            {/* Floating Tooltip Bubble */}
            <div 
                ref={tooltipRef}
                style={tooltipStyle}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col pointer-events-auto transition-all duration-300 ease-out animate-in fade-in zoom-in-95"
            >
                {/* Header Progress Indicators */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[9px] font-black tracking-tight px-2 py-0.5 rounded-full border shrink-0",
                            currentChapter.badgeBg
                        )}>
                            STEP {currentStep + 1}
                        </span>
                        <div className="flex gap-1">
                            {CHAPTERS.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "w-1.5 h-1.5 rounded-full transition-all duration-200",
                                        idx === currentStep ? "w-3 bg-blue-600" : "bg-slate-350"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                    <button 
                        onClick={() => handleClose(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Instruction Body */}
                <div className="p-5 flex-1 overflow-y-auto max-h-[350px] space-y-4">
                    
                    {/* Chapter Title */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm",
                            currentChapter.color
                        )}>
                            <IconComponent className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight break-keep">{currentChapter.title}</h3>
                    </div>

                    {/* Step Guidelines */}
                    <div className="space-y-2">
                        {currentChapter.steps.map((step, idx) => (
                            <div 
                                key={idx} 
                                className="flex gap-2.5 items-start bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-2.5 rounded-lg transition-colors"
                            >
                                <span className={cn(
                                    "text-[9px] font-black text-white px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 shadow-xs",
                                    currentChapter.color
                                )}>
                                    ✔
                                </span>
                                <p className="text-xs font-semibold text-slate-750 leading-relaxed break-keep">
                                    {step}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Mobile fallback indicator */}
                    {isMobileFallback && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
                            <span className="text-sm shrink-0">📱</span>
                            <p className="text-[10px] text-amber-900 leading-normal font-semibold break-keep">
                                모바일 화면에서는 상단 삼선(☰) 단추를 눌러 지목된 메뉴를 직접 찾아 탭해 주시기 바랍니다.
                            </p>
                        </div>
                    )}

                    {/* Tip Section */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex gap-2">
                        <Info className={cn("w-4 h-4 shrink-0 mt-0.5", currentChapter.textColor)} />
                        <div className="space-y-0.5 min-w-0">
                            <p className={cn("text-[10px] font-bold", currentChapter.textColor)}>NEXUS 가이드 봇 🤖</p>
                            <p className="text-[10px] text-slate-600 leading-relaxed font-medium break-keep">
                                {currentChapter.tip}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                        onClick={() => handleClose(true)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors p-1"
                    >
                        다시 보지 않기
                    </button>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className="h-8 px-2.5 rounded-lg border-slate-300 text-slate-700 font-bold text-xs"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                            이전
                        </Button>
                        
                        <Button
                            onClick={handleNext}
                            className={cn(
                                "h-8 px-3 rounded-lg text-white font-bold text-xs shadow-xs transition-colors",
                                currentStep === CHAPTERS.length - 1 ? "bg-emerald-600 hover:bg-emerald-750" : "bg-blue-600 hover:bg-blue-755"
                            )}
                        >
                            {currentStep === CHAPTERS.length - 1 ? (
                                <span className="flex items-center gap-1">
                                    가이드 종료 <CheckCircle2 className="w-3.5 h-3.5" />
                                </span>
                            ) : (
                                <span className="flex items-center gap-0.5">
                                    다음 지시 <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    )
}
