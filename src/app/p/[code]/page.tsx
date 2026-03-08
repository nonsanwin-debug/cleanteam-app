import { Metadata } from 'next'
import { getPublicPortfolio, PublicSite } from '@/actions/portfolio'
import { format } from 'date-fns'

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
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 leading-tight">
                            {response.companyName}
                        </h1>
                        <p className="text-xs text-blue-600 font-semibold tracking-wide">
                            최근 30일 포트폴리오
                        </p>
                    </div>
                </div>
            </header>

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
                                    <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-lg text-sm">
                                        {format(new Date(site.completed_at), 'd일')}
                                    </span>
                                    {site.name}
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
            <footer className="text-center py-8 text-xs text-slate-400 font-medium">
                Powered by <span className="font-bold text-slate-500">NEXUS</span>
            </footer>
        </div>
    )
}
