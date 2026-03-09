import { Metadata } from 'next'
import { getPublicPortfolio, PublicSite } from '@/actions/portfolio'
import { format } from 'date-fns'
import { MessageSquare, Phone } from 'lucide-react'

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

function PhotoGrid({ photos, title }: { photos: string[], title: string }) {
    if (!photos || photos.length === 0) return null
    return (
        <div className="mt-4">
            <h4 className="text-sm font-bold text-slate-700 mb-2 border-l-2 border-blue-500 pl-2">
                {title}
            </h4>
            <div className={`grid gap-2 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {photos.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 shadow-sm border border-slate-200">
                        <img
                            src={url}
                            alt={`${title} 사진 ${i + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

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
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm px-4 py-4">
                <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center gap-1">
                    <div className="flex items-center gap-1.5 justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px]" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="header-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#6366F1" />
                                    <stop offset="50%" stopColor="#0EA5E9" />
                                    <stop offset="100%" stopColor="#2DD4BF" />
                                </linearGradient>
                                <linearGradient id="header-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#2DD4BF" />
                                    <stop offset="100%" stopColor="#10B981" />
                                </linearGradient>
                                <linearGradient id="header-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#059669" />
                                    <stop offset="100%" stopColor="#BEF264" />
                                </linearGradient>
                            </defs>
                            <path d="M6 20V4" stroke="url(#header-grad-1)" strokeWidth="5.5" strokeLinecap="round" />
                            <path d="M6 4L18 20" stroke="url(#header-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                            <path d="M18 20V4" stroke="url(#header-grad-3)" strokeWidth="5.5" strokeLinecap="round" />
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
            <div className="max-w-md mx-auto px-4 pt-4">
                <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-blue-800 leading-relaxed font-medium mb-3">
                        청소 중에는 전화를 못 받을 수 있으니, 문자로 <span className="font-bold text-blue-900">[지역 / 아파트명 / 평수 / 날짜]</span>를 남겨주시면 확인 후 바로 연락드리겠습니다.
                    </p>

                    {response.promotionContactNumber && (
                        <div className="flex gap-2">
                            <a
                                href={`sms:${response.promotionContactNumber.replace(/[^0-9]/g, '')}`}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <MessageSquare className="w-4 h-4" />
                                문자 보내기
                            </a>
                            <a
                                href={`tel:${response.promotionContactNumber.replace(/[^0-9]/g, '')}`}
                                className="flex-1 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                전화 걸기
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <main className="max-w-md mx-auto p-4 space-y-6">
                {sites.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-500 font-medium">최근 등록된 현장 사진이 없습니다.</p>
                    </div>
                ) : (
                    sites.map((site) => (
                        <article key={site.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                            {/* Site Header */}
                            <div className="mb-4">
                                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-lg text-sm flex-shrink-0">
                                        {format(new Date(site.completed_at), 'd일')}
                                    </span>
                                    <span className="truncate">{site.address}</span>
                                </h2>
                            </div>

                            {/* Before Photos */}
                            <PhotoGrid photos={site.photos_before} title="작업 전" />

                            {/* After Photos */}
                            <PhotoGrid photos={site.photos_after} title="작업 후" />

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
                                <stop offset="0%" stopColor="#6366F1" />
                                <stop offset="50%" stopColor="#0EA5E9" />
                                <stop offset="100%" stopColor="#2DD4BF" />
                            </linearGradient>
                            <linearGradient id="nx-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2DD4BF" />
                                <stop offset="100%" stopColor="#10B981" />
                            </linearGradient>
                            <linearGradient id="nx-grad-3" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#059669" />
                                <stop offset="100%" stopColor="#BEF264" />
                            </linearGradient>
                        </defs>
                        <path d="M6 20V4" stroke="url(#nx-grad-1)" strokeWidth="5.5" strokeLinecap="round" />
                        <path d="M6 4L18 20" stroke="url(#nx-grad-2)" strokeWidth="5.5" strokeLinecap="round" />
                        <path d="M18 20V4" stroke="url(#nx-grad-3)" strokeWidth="5.5" strokeLinecap="round" />
                    </svg>
                    <span className="font-black text-[#0F172A] tracking-tighter text-[16px] ml-0.5 mt-0.5">NEXUS</span>
                </div>
            </footer>
        </div>
    )
}
