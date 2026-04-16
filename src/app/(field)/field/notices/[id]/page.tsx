import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Megaphone, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const adminClient = createAdminClient()

    const { data: notice, error } = await adminClient
        .from('partner_notices')
        .select('id, title, content, created_at')
        .eq('id', id)
        .eq('is_active', true)
        .single()

    if (error || !notice) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Link href="/field/home" className="p-1 -ml-1 rounded-lg hover:bg-slate-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <h1 className="text-base font-bold text-slate-800">공지사항</h1>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Title Area */}
                    <div className="p-5 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                            <div className="bg-teal-50 p-2 rounded-lg shrink-0 mt-0.5">
                                <Megaphone className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 leading-snug">
                                    {notice.title}
                                </h2>
                                <p className="text-xs text-slate-400 mt-1.5">
                                    {new Date(notice.created_at).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                        {notice.content ? (
                            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {notice.content}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">내용이 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
