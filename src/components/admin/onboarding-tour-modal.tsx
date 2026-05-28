'use client'

import { useState, useEffect } from 'react'
import { 
    X, 
    Building2, 
    UserPlus, 
    Users, 
    Share2, 
    Inbox, 
    ChevronLeft, 
    ChevronRight, 
    HelpCircle, 
    CheckCircle2, 
    Sparkles, 
    Info 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface OnboardingTourModalProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    triggerButtonClassName?: string
}

const CHAPTERS = [
    {
        id: 'register',
        title: '현장 추가 방법',
        subtitle: 'NEXUS에서 새 현장을 등록하고 관리 일정을 생성합니다.',
        icon: Building2,
        color: 'from-blue-500 to-indigo-600',
        bgLight: 'bg-blue-50/50',
        borderLight: 'border-blue-100',
        iconColor: 'text-blue-600',
        steps: [
            {
                num: '01',
                text: '대화형 사이드바의 현장 관리 메뉴로 이동합니다.',
                desc: '대시보드 또는 왼쪽 사이드바에서 [현장 관리] 메뉴를 누르세요.'
            },
            {
                num: '02',
                text: '우측 상단의 [현장 등록] 버튼을 누릅니다.',
                desc: '현장 등록 모달이 화면에 나타납니다.'
            },
            {
                num: '03',
                text: '상세한 현장 정보를 누락 없이 기입합니다.',
                desc: '주소(건물명, 동/호수), 평수, 청소 날짜, 작업 시간, 연락처 등 핵심 고객 정보를 입력합니다.'
            },
            {
                num: '04',
                text: '하단의 [등록] 버튼을 눌러 일정을 생성합니다.',
                desc: '성공적으로 등록되면 달력 및 목록 카드에 새 일정이 실시간 반영됩니다.'
            }
        ],
        tip: '정확한 주소와 날짜를 입력해야만 현장 요원이 앱에서 주소 네비게이션을 이용하고 출퇴근을 정상 기록할 수 있습니다.'
    },
    {
        id: 'workers',
        title: '팀장/팀원 생성 방법',
        subtitle: '현장 실시간 통제 및 모바일 사진 업로드를 수행할 요원을 등록합니다.',
        icon: UserPlus,
        color: 'from-purple-500 to-indigo-600',
        bgLight: 'bg-purple-50/50',
        borderLight: 'border-purple-100',
        iconColor: 'text-purple-600',
        steps: [
            {
                num: '01',
                text: '사이드바의 [사용자 관리] 메뉴로 이동합니다.',
                desc: '사용자 및 정산 관리 화면이 나타납니다.'
            },
            {
                num: '02',
                text: '상단 탭에서 [팀원 관리] 탭을 클릭합니다.',
                desc: '현재 등록된 모든 현장 요원 목록을 볼 수 있습니다.'
            },
            {
                num: '03',
                text: '우측 상단의 [새 팀원 추가] 버튼을 클릭합니다.',
                desc: '팀원 등록 전용 폼 화면으로 이동합니다.'
            },
            {
                num: '04',
                text: '이름, 연락처를 채우고 역할을 부여합니다.',
                desc: '팀장(현장 총괄 권한) 또는 팀원(일반 작업 요원)을 선택하고, 로그인 비밀번호를 함께 설정한 후 등록합니다.'
            }
        ],
        tip: 'NEXUS 현장 요원 전용 모바일 앱에 로그인할 수 있도록, 등록 시 비밀번호를 해당 팀장/팀원분에게 안내해 주시기 바랍니다.'
    },
    {
        id: 'assignment',
        title: '팀장 및 팀원 현장 배정',
        subtitle: '현장마다 담당 팀장과 보조 팀원을 지정해 일정을 전달합니다.',
        icon: Users,
        color: 'from-pink-500 to-rose-600',
        bgLight: 'bg-rose-50/50',
        borderLight: 'border-rose-100',
        iconColor: 'text-rose-600',
        steps: [
            {
                num: '01',
                text: '현장 관리 화면에서 날짜를 선택합니다.',
                desc: '해당 일자에 예정된 현장 목록 카드들이 노출됩니다.'
            },
            {
                num: '02',
                text: '현장 카드 내부의 [담당 팀장]을 직접 지정합니다.',
                desc: '팀장 드롭다운 목록에서 관리할 메인 팀장을 즉시 선택할 수 있습니다.'
            },
            {
                num: '03',
                text: '보조 팀원은 [드래그 앤 드롭]으로 배정합니다 (PC).',
                desc: '화면 아래의 팀원 목록 배지를 마우스로 끌어서 배정할 현장 카드 위에 놓으면 배정이 완료됩니다.'
            },
            {
                num: '04',
                text: '모바일 환경에서는 [터치 방식]을 이용합니다.',
                desc: '하단 목록에서 팀원 배지를 먼저 가볍게 터치해 선택한 뒤, 배정할 현장 카드를 터치하면 똑똑하게 자동 배정됩니다.'
            }
        ],
        tip: '배정이 완료되는 즉시 현장 팀장의 모바일 앱 화면에 해당 현장이 노출되며 실시간 사진 촬영 및 체크리스트 작성이 가능해집니다.'
    },
    {
        id: 'sharing',
        title: '오더 공유하기 (이관)',
        subtitle: '일정이 겹치거나 먼 거리에 있는 현장을 다른 제휴사에 직접 위탁합니다.',
        icon: Share2,
        color: 'from-emerald-500 to-teal-600',
        bgLight: 'bg-emerald-50/50',
        borderLight: 'border-emerald-100',
        iconColor: 'text-emerald-600',
        steps: [
            {
                num: '01',
                text: '현장 카드 우측 상단의 [더보기 (세 점)]를 클릭합니다.',
                desc: '현장 관리 기능 메뉴들이 열립니다.'
            },
            {
                num: '02',
                text: '목록 메뉴에서 [오더 공유]를 선택합니다.',
                desc: '직접 오더 공유 팝업이 활성화됩니다.'
            },
            {
                num: '03',
                text: '상대방 업체의 고유 검색 정보를 기입합니다.',
                desc: '업체명#코드명(4자리 숫자) 형식(예: 클린체크#1234)을 입력하고 [검증] 버튼을 눌러 파트너사를 찾습니다.'
            },
            {
                num: '04',
                text: '매칭된 파트너사를 확인 후 [공유하기]를 누릅니다.',
                desc: '이관 완료 시 상대 업체로 데이터가 즉시 전달됩니다.'
            }
        ],
        tip: '오더가 안전하게 공유(이관)되면, 나의 화면에서는 오더가 "읽기 전용"으로 보존되어 중복 제어 및 정산 분쟁을 완벽히 차단합니다.'
    },
    {
        id: 'receiving',
        title: '공유 오더 받고 수행하기',
        subtitle: '제휴 파트너가 보낸 공유 오더를 수락해 신규 매출을 창출합니다.',
        icon: Inbox,
        color: 'from-amber-500 to-orange-600',
        bgLight: 'bg-amber-50/50',
        borderLight: 'border-amber-100',
        iconColor: 'text-amber-600',
        steps: [
            {
                num: '01',
                text: '왼쪽 사이드바의 [오더 공유 센터] 메뉴를 클릭합니다.',
                desc: '공유 오더의 송수신 상태를 총괄 관제하는 화면입니다.'
            },
            {
                num: '02',
                text: '[받은 공유 오더 (incoming)] 탭을 클릭합니다.',
                desc: '다른 업체가 나에게 공유 제안한 오더 목록이 나타납니다.'
            },
            {
                num: '03',
                text: '수락 대기 중인 오더 내역과 단가를 꼼꼼히 확인합니다.',
                desc: '현장 위치 및 가격 정보를 사전에 검토합니다.'
            },
            {
                num: '04',
                text: '현장 카드의 [오더 수락하기] 버튼을 누릅니다.',
                desc: '수락 즉시 해당 현장이 나의 [현장 관리]로 이관되어, 전권을 넘겨받아 팀장을 즉시 배정하고 수행할 수 있습니다.'
            }
        ],
        tip: '공유 오더를 수락하는 시점에 일정량의 수수료(캐쉬)가 정산 규칙에 따라 사용될 수 있으므로, 항상 캐쉬 잔액을 미리 충전해 두시는 것을 권장합니다.'
    }
]

export function OnboardingTourModal({ open: externalOpen, onOpenChange, triggerButtonClassName }: OnboardingTourModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
                onClick={() => handleClose(false)}
            />

            {/* Modal Body */}
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[650px] animate-in fade-in zoom-in-95 duration-200 z-10">
                
                {/* Left Navigation Bar (Desktop) */}
                <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-5 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible shrink-0 scrollbar-none">
                    <div className="hidden md:flex items-center gap-2 px-2 py-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                            <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-400 leading-none">NEXUS ADMIN</p>
                            <p className="text-sm font-bold text-slate-900 mt-1 leading-none">서비스 초보 가이드</p>
                        </div>
                    </div>

                    {CHAPTERS.map((chap, idx) => {
                        const ChapIcon = chap.icon
                        const isSelected = idx === currentStep
                        return (
                            <button
                                key={chap.id}
                                onClick={() => setCurrentStep(idx)}
                                className={cn(
                                    "flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 md:shrink-0",
                                    isSelected 
                                        ? "bg-slate-900 text-white shadow-sm" 
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                                )}
                            >
                                <span className={cn(
                                    "p-1.5 rounded-lg flex items-center justify-center shrink-0",
                                    isSelected ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200"
                                )}>
                                    <ChapIcon className="w-3.5 h-3.5" />
                                </span>
                                <div className="truncate">
                                    <p className="text-[10px] text-slate-400 leading-none">Chapter {idx + 1}</p>
                                    <p className="mt-1 leading-none truncate">{chap.title}</p>
                                </div>
                            </button>
                        )
                    })}

                    <div className="hidden md:block mt-auto bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                        <div className="flex gap-2">
                            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-900 leading-normal font-medium">
                                이 가이드는 대시보드 우측 상단의 <b>[가이드 다시보기]</b> 버튼을 통해 언제든 다시 볼 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Content Panel */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                CHAPTER {currentStep + 1}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">/ 전체 {CHAPTERS.length}개</span>
                        </div>
                        <button 
                            onClick={() => handleClose(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Contents */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* Title & Introduction */}
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br shadow-md",
                                currentChapter.color
                            )}>
                                <IconComponent className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{currentChapter.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">{currentChapter.subtitle}</p>
                            </div>
                        </div>

                        {/* Step Checklists */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {currentChapter.steps.map((step, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex gap-3.5 p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition-colors duration-200"
                                >
                                    <span className="text-xs font-black text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-xs shrink-0 self-start">
                                        {step.num}
                                    </span>
                                    <div className="space-y-1 min-w-0">
                                        <h4 className="text-xs font-bold text-slate-800 leading-tight break-keep">{step.text}</h4>
                                        <p className="text-[11px] text-slate-500 leading-normal break-keep font-medium">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tip Block */}
                        <div className={cn(
                            "rounded-xl border p-4.5 flex gap-3 shadow-xs",
                            currentChapter.bgLight,
                            currentChapter.borderLight
                        )}>
                            <Info className={cn("w-4.5 h-4.5 shrink-0 mt-0.5", currentChapter.iconColor)} />
                            <div className="space-y-1">
                                <p className={cn("text-xs font-bold", currentChapter.iconColor)}>NEXUS 운영 꿀팁</p>
                                <p className="text-[11px] text-slate-700 leading-normal break-keep font-medium">{currentChapter.tip}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                        <button
                            onClick={() => handleClose(true)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors p-1"
                        >
                            다시 보지 않기
                        </button>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={handlePrev}
                                disabled={currentStep === 0}
                                className="h-9 px-3 rounded-lg border-slate-300 text-slate-700 font-semibold text-xs"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                이전
                            </Button>
                            
                            <Button
                                onClick={handleNext}
                                className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
                            >
                                {currentStep === CHAPTERS.length - 1 ? (
                                    <span className="flex items-center gap-1">
                                        가이드 완료 <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-0.5">
                                        다음 단계 <ChevronRight className="w-4 h-4 ml-0.5" />
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
