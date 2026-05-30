'use client'

import { useState, useEffect, useRef } from 'react'
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
    Info,
    MonitorPlay
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface OnboardingTourModalProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const CHAPTERS = [
    {
        id: 'register',
        title: '현장 추가 방법',
        targetId: 'nav-sites',
        icon: Building2,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        steps: [
            '왼쪽 메뉴에서 [현장 관리] 메뉴를 누르세요.',
            '화면 우측 상단의 [현장 등록] 버튼을 클릭합니다.',
            '상세 주소, 날짜, 고객 연락처 등 기본 폼 정보를 채웁니다.',
            '하단의 [등록]을 완료하면 즉시 캘린더와 목록에 일정이 반영됩니다.'
        ],
        tip: '정확한 주소 정보를 입력해야 모바일 앱의 네비게이션 및 요원의 정상 출퇴근 기록이 가능합니다.'
    },
    {
        id: 'workers',
        title: '팀장/팀원 생성',
        targetId: 'nav-users',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        steps: [
            '[사용자 관리] 메뉴의 [팀원 관리] 탭을 누르세요.',
            '우측 상단의 [새 팀원 추가] 버튼을 클릭해 등록 페이지로 이동합니다.',
            '이름, 연락처를 입력하고 역할을 지정합니다 (팀장 또는 팀원).',
            '설정한 로그인 비밀번호는 현장 요원에게 전달하여 앱에 로그인하게 안내합니다.'
        ],
        tip: '팀장(현장 총괄 및 대표)과 팀원(일반 보조 요원) 구분을 명확히 해 주시면 배정이 수월합니다.'
    },
    {
        id: 'assignment',
        title: '현장에 요원 배정하기',
        targetId: 'nav-sites',
        icon: Users,
        color: 'bg-rose-600',
        textColor: 'text-rose-600',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-100',
        steps: [
            '[현장 관리] 목록에서 원하는 현장을 골라 담당 팀장을 지정하세요.',
            'PC 환경: 화면 하단의 팀원 목록 배지에서 원하는 멤버를 클릭해 현장 카드로 [드래그 앤 드롭]하여 드롭합니다.',
            '모바일 환경: 하단의 팀원을 먼저 가볍게 터치해 선택한 후, 배정할 현장 카드를 터치하면 스마트하게 들어갑니다.'
        ],
        tip: '요원이 현장에 정상 배정되어야 요원 전용 모바일 앱에 해당 일정이 나타나고 작업 사진을 올릴 수 있게 됩니다.'
    },
    {
        id: 'sharing',
        title: '오더 공유 (이관)',
        targetId: 'nav-sites',
        icon: Share2,
        color: 'bg-emerald-600',
        textColor: 'text-emerald-600',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        steps: [
            '[현장 관리] 목록의 현장 카드 우측 상단 [더보기 (세 점)] 아이콘을 클릭합니다.',
            '[오더 공유]를 클릭한 후, 파트너 업체의 고유 정보(예: 클린체크#1234)를 검색해 검증합니다.',
            '매칭된 파트너사를 확인하고 [공유하기]를 누르면 일정이 즉시 안전하게 이관됩니다.',
            '오더가 이관 완료되면 본래 현장 카드는 중복 수정 방지를 위해 [읽기 전용]으로 영구 보존됩니다.'
        ],
        tip: '직접 처리하기 곤란한 대량 오더나 타 지역 오더를 제휴사에 넘길 때 최적의 기능입니다.'
    },
    {
        id: 'receiving',
        title: '공유 오더 수락/수행',
        targetId: 'nav-shared-orders',
        icon: Inbox,
        color: 'bg-orange-600',
        textColor: 'text-orange-600',
        badgeBg: 'bg-orange-50 text-orange-700 border-orange-100',
        steps: [
            '[오더 공유 센터] 메뉴로 들어가 [받은 공유 오더 (incoming)] 탭을 클릭합니다.',
            '다른 파트너사에서 나에게 위탁한 오더와 정산 단가를 확인합니다.',
            '[오더 수락하기] 버튼을 누르면 해당 오더가 즉시 나의 새로운 매출로 이관됩니다.',
            '수락 완료 직후 나의 [현장 관리] 화면에 새 현장 카드가 활성화되어 전권을 갖고 배정할 수 있게 됩니다.'
        ],
        tip: '공유 오더를 수락하는 시점에는 약정된 캐쉬 잔액이 사용되므로, 대시보드나 설정에서 캐쉬를 미리 넉넉히 충전해 주시기 바랍니다.'
    }
]

export function OnboardingTourModal({ open: externalOpen, onOpenChange }: OnboardingTourModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [isMobileFallback, setIsMobileFallback] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    // Sync external open state
    useEffect(() => {
        if (externalOpen !== undefined) {
            setIsOpen(externalOpen)
            if (externalOpen) {
                setCurrentStep(0)
            }
        }
    }, [externalOpen])

    // Auto open logic on first sign-up / first dashboard view
    useEffect(() => {
        if (externalOpen === undefined) {
            const isCompleted = localStorage.getItem('nexus_admin_onboarding_completed')
            if (isCompleted !== 'true') {
                setIsOpen(true)
            }
        }
    }, [externalOpen])

    // Track element position in real-time (Spotlight calculation)
    useEffect(() => {
        if (!isOpen) return

        const updatePosition = () => {
            const targetId = CHAPTERS[currentStep].targetId
            const element = document.getElementById(targetId)
            
            if (element) {
                const rect = element.getBoundingClientRect()
                // If element is not rendered, hidden or screen size is mobile/collapsed
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

        // Run instantly
        updatePosition()

        // Keep updating on transitions, scroll, and resize
        const intervalId = setInterval(updatePosition, 150)
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
        if (onOpenChange) {
            onOpenChange(false)
        }
    }

    const handleNext = () => {
        if (currentStep < CHAPTERS.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            handleClose(true)
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const currentChapter = CHAPTERS[currentStep]
    const IconComponent = currentChapter.icon

    if (!isOpen) return null

    // Calculate floating tooltip coordinates in real-time
    const getTooltipStyle = () => {
        if (isMobileFallback || !targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                position: 'fixed' as const,
                width: 'min(92vw, 400px)',
                zIndex: 51
            }
        }

        // On desktop, place the bubble to the right of the highlighted sidebar menu item
        const spaceOnRight = window.innerWidth - targetRect.right
        if (spaceOnRight > 400) {
            return {
                top: Math.min(
                    window.innerHeight - 480, 
                    Math.max(20, targetRect.top + (targetRect.height / 2) - 180)
                ),
                left: targetRect.right + 24,
                position: 'fixed' as const,
                width: '380px',
                zIndex: 51
            }
        }

        // Fallback to placing below the highlighted menu
        return {
            top: targetRect.bottom + 16,
            left: Math.max(16, targetRect.left + (targetRect.width / 2) - 190),
            position: 'fixed' as const,
            width: '380px',
            zIndex: 51
        }
    }

    const tooltipStyle = getTooltipStyle()

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden select-none">
            {/* Backdrop Mask */}
            <div 
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] transition-opacity duration-300"
                onClick={() => handleClose(false)}
            />

            {/* Spotlight Highlight Element */}
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
                    {/* Glowing outer aura (pulse animation) */}
                    <div className="absolute -inset-1 rounded-xl border border-blue-400/60 animate-ping opacity-75 pointer-events-none" />
                </div>
            )}

            {/* Floating Tooltip Bubble */}
            <div 
                ref={tooltipRef}
                style={tooltipStyle}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ease-out animate-in fade-in zoom-in-95"
            >
                {/* Header Info */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[10px] font-black tracking-tight px-2 py-0.5 rounded-full border shrink-0",
                            currentChapter.badgeBg
                        )}>
                            CHAPTER {currentStep + 1}
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

                {/* Instruction Panel */}
                <div className="p-5 flex-1 overflow-y-auto max-h-[380px] space-y-4">
                    
                    {/* Chapter Title */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm",
                            currentChapter.color
                        )}>
                            <IconComponent className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">{currentChapter.title}</h3>
                    </div>

                    {/* Step List */}
                    <div className="space-y-2.5">
                        {currentChapter.steps.map((step, idx) => (
                            <div 
                                key={idx} 
                                className="flex gap-2.5 items-start bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-2.5 rounded-lg transition-colors"
                            >
                                <span className={cn(
                                    "text-[9px] font-black text-white px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 shadow-xs",
                                    currentChapter.color
                                )}>
                                    {idx + 1}
                                </span>
                                <p className="text-xs font-semibold text-slate-750 leading-relaxed break-keep">
                                    {step}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Mobile fallback notification if necessary */}
                    {isMobileFallback && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
                            <span className="text-sm shrink-0">📱</span>
                            <p className="text-[10px] text-amber-900 leading-normal font-semibold break-keep">
                                모바일 환경에서는 상단 메뉴 삼선(☰) 단추를 터치하신 후 지목된 메뉴를 선택해 주세요.
                            </p>
                        </div>
                    )}

                    {/* Tip Section */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 flex gap-2">
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
                                    훈련 종료 <CheckCircle2 className="w-3.5 h-3.5" />
                                </span>
                            ) : (
                                <span className="flex items-center gap-0.5">
                                    다음 지시 <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Floating tooltip pointer arrow pointing to the highlighted button (Desktop only) */}
                {targetRect && !isMobileFallback && (
                    <div 
                        className="hidden md:block absolute w-3 h-3 bg-white border-l border-b border-slate-200 rotate-45"
                        style={{
                            left: '-6px',
                            top: '40px',
                            boxShadow: '-2px 2px 4px -2px rgba(0,0,0,0.06)'
                        }}
                    />
                )}
            </div>
        </div>
    )
}
