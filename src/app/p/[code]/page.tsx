import { Metadata } from 'next'
import { getPublicPortfolio, PublicSite } from '@/actions/portfolio'
import { format } from 'date-fns'
import { MessageSquare, Phone, Calendar, Leaf, Award, ShieldCheck, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
    params: { code: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolvedParams = await params
    const portfolio = await getPublicPortfolio(resolvedParams.code)

    if (!portfolio.success || !portfolio.companyName) {
        return { title: '포트폴리오' }
    }

    return {
        title: `${portfolio.companyName} 포트폴리오 | NEXUS`,
        description: `${portfolio.companyName}의 최신 작업 결과물입니다.`,
    }
}

import { PhotoGrid } from '@/components/portfolio/photo-grid'

export default async function PublicPortfolioPage({ params }: PageProps) {
    const resolvedParams = await params
    const response = await getPublicPortfolio(resolvedParams.code)

    if (!response.success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center space-y-3">
                    <h1 className="text-2xl font-bold text-slate-800">접근불가</h1>
                    <p className="text-slate-500">{response.error}</p>
                </div>
            </div>
        )
    }

    const sites = response.sites || []

    return (
        <div className="min-h-screen bg-slate-50 pb-20 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden -z-0 pointer-events-none">
                <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] rounded-full bg-blue-300/30 blur-[60px] animate-pulse"></div>
                <div className="absolute top-[50px] -right-[100px] w-[350px] h-[350px] rounded-full bg-indigo-300/20 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm px-4 py-4">
                <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center gap-1">
                    <div className="flex items-center gap-1.5 justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px]" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="header-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#4F46E5" />
                                    <stop offset="100%" stopColor="#22D3EE" />
                                </linearGradient>
                                <linearGradient id="header-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#22D3EE" />
                                    <stop offset="100%" stopColor="#10B981" />
                                </linearGradient>
                                <linearGradient id="header-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#10B981" />
                                    <stop offset="100%" stopColor="#BEF264" />
                                </linearGradient>
                            </defs>
                            <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#header-grad-1)" />
                            <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#header-grad-3)" />
                            <path d="M5.25 4.75L18.75 19.25" stroke="url(#header-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                        </svg>
                        <span className="font-black text-[#0F172A] tracking-tighter text-[18px] ml-0.5 mt-0.5 cursor-default">NEXUS</span>
                        <span className="text-slate-400 font-medium mx-0.5 text-sm mt-0.5 cursor-default">x</span>
                        <span className="text-lg font-black text-slate-800 leading-tight max-w-[150px] sm:max-w-[200px] truncate mt-0.5">
                            {response.companyName}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                        최근 30일 작업 포트폴리오
                    </p>
                </div>
            </header>

            {/* Notice Banner */}
            <div className="max-w-md mx-auto px-4 pt-4 relative z-10">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/80 border border-blue-100/50 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300">
                    <p className="text-sm text-blue-900 leading-relaxed font-medium mb-4">
                        청소 중에는 전화를 못 받을 수 있으니, 문자로 <span className="font-bold bg-blue-100 text-blue-900 px-1 py-0.5 rounded mx-0.5 break-keep">[지역 / 아파트명 / 평수 / 날짜]</span>를 남겨주시면 확인 후 바로 연락드리겠습니다.
                    </p>

                    {response.promotionContactNumber && (
                        <div className="flex gap-2.5">
                            <a
                                href={`sms:${response.promotionContactNumber.replace(/[^0-9]/g, '')}`}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 shadow-sm hover:shadow-blue-200 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300"
                            >
                                <MessageSquare className="w-4 h-4 animate-bounce" style={{ animationDuration: '2s' }} />
                                문자 보내기
                            </a>
                            <a
                                href={`tel:${response.promotionContactNumber.replace(/[^0-9]/g, '')}`}
                                className="flex-1 bg-white hover:bg-slate-50 hover:-translate-y-0.5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-blue-100 text-blue-700 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300"
                            >
                                <Phone className="w-4 h-4" />
                                전화 걸기
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <main className="max-w-md mx-auto p-4 space-y-6 relative z-10 mt-2">
                {sites.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-slate-500 font-medium">최근 등록된 현장 사진이 없습니다.</p>
                    </div>
                ) : (
                    sites.map((site) => (
                        <article key={site.id} className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl hover:-translate-y-1 border border-slate-100 transition-all duration-300 group">
                            {/* Site Header */}
                            <div className="mb-5 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-100/50 shadow-sm">
                                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                        {format(new Date(site.completed_at), 'M월 d일')} 작업
                                    </span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                                    {site.address}
                                </h2>
                            </div>

                            {/* Before Photos */}
                            <PhotoGrid photos={site.photos_before} title="작업 전" />

                            {/* After Photos */}
                            <PhotoGrid photos={site.photos_after} title="작업 후" />

                            {/* Trust Badges */}
                            <div className="mt-6 border-t border-slate-100 pt-5">
                                <h4 className="text-xs font-bold text-slate-400 mb-3 text-center">NEXUS x {response.companyName} 프리미엄 케어</h4>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-100/80 p-2.5 rounded-xl transition-transform hover:scale-105">
                                        <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg flex-shrink-0">
                                            <Leaf className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-bold text-emerald-800 leading-tight">친환경 세제<br/>사용</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-100/80 p-2.5 rounded-xl transition-transform hover:scale-105">
                                        <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg flex-shrink-0">
                                            <Award className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-bold text-blue-800 leading-tight">전문가 직접<br/>시공</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-100/80 p-2.5 rounded-xl transition-transform hover:scale-105">
                                        <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg flex-shrink-0">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-indigo-800 leading-tight">안심보증 서비스</span>
                                            {(() => {
                                                const completedDate = new Date(site.completed_at);
                                                const guaranteeEndDate = new Date(completedDate);
                                                guaranteeEndDate.setDate(guaranteeEndDate.getDate() + 7);
                                                guaranteeEndDate.setHours(23, 59, 59, 999);
                                                const remainingDays = Math.ceil((guaranteeEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                                return remainingDays > 0 ? (
                                                    <span className="text-[10px] font-black text-indigo-600 mt-0.5 tracking-tight">남은기간 {remainingDays}일</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">보증 만료</span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-purple-50/80 border border-purple-100/80 p-2.5 rounded-xl transition-transform hover:scale-105">
                                        <div className="bg-purple-100 text-purple-600 p-1.5 rounded-lg flex-shrink-0">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-bold text-purple-800 leading-tight">고온 스팀<br/>살균</span>
                                    </div>
                                </div>
                            </div>


                        </article>
                    ))
                )}
            </main>

            {/* Footer */}
            <footer className="flex items-center justify-center py-10 text-xs text-slate-400 font-medium gap-1.5">
                <span>Powered by</span>
                <div className="flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="nx-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#4F46E5" />
                                <stop offset="100%" stopColor="#22D3EE" />
                            </linearGradient>
                            <linearGradient id="nx-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#22D3EE" />
                                <stop offset="100%" stopColor="#10B981" />
                            </linearGradient>
                            <linearGradient id="nx-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#BEF264" />
                            </linearGradient>
                        </defs>
                        <rect x="2.5" y="2" width="5.5" height="20" rx="2.75" fill="url(#nx-grad-1)" />
                        <rect x="16" y="2" width="5.5" height="20" rx="2.75" fill="url(#nx-grad-3)" />
                        <path d="M5.25 4.75L18.75 19.25" stroke="url(#nx-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                    </svg>
                    <span className="font-black text-[#0F172A] tracking-tighter text-[16px] ml-0.5 mt-0.5">NEXUS</span>
                </div>
            </footer>
        </div>
    )
}
