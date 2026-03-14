'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquarePlus, Clock, CheckCircle2, Building2, Calendar } from 'lucide-react'
import { resolveInquiry } from '@/actions/inquiries'
import { useRouter } from 'next/navigation'

export function MasterInquiriesClient({ initialInquiries }: { initialInquiries: any[] }) {
    const router = useRouter()
    const [inquiries, setInquiries] = useState(initialInquiries)
    const [resolvingId, setResolvingId] = useState<string | null>(null)

    const handleResolve = async (id: string) => {
        if (!confirm('이 문의를 처리 완료 상태로 변경하시겠습니까?')) return

        setResolvingId(id)
        const result = await resolveInquiry(id)
        setResolvingId(null)

        if (result.success) {
            alert('처리 완료되었습니다.')
            // Optimistic update
            setInquiries(prev => 
                prev.map(inquiry => 
                    inquiry.id === id 
                    ? { ...inquiry, status: 'resolved', resolved_at: new Date().toISOString() } 
                    : inquiry
                )
            )
        } else {
            alert(result.error || '상태 업데이트에 실패했습니다.')
        }
    }

    const getTypeKorean = (t: string) => {
        switch (t) {
            case 'general': return '일반 문의'
            case 'banner': return '배너 광고 요청'
            case 'point': return '포인트 충전 요청'
            default: return t
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <MessageSquarePlus className="w-6 h-6 text-purple-600" />
                    업체 문의 / 요청 관리
                </h1>
                <p className="text-slate-500 mt-1">
                    각 업체에서 보낸 문의 및 요청 사항을 확인하고 처리합니다.
                </p>
            </div>

            {inquiries.length === 0 ? (
                <Card className="border-dashed bg-slate-50">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <MessageSquarePlus className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">접수된 문의가 없습니다</h3>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inquiries.map(inquiry => (
                        <Card key={inquiry.id} className={`overflow-hidden flex flex-col transition-all duration-200 ${inquiry.status === 'resolved' ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white shadow-md border-purple-100 ring-1 ring-purple-50'}`}>
                            
                            {/* Header */}
                            <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {inquiry.status === 'pending' ? (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 font-bold hover:bg-amber-200">
                                                <Clock className="w-3.5 h-3.5 mr-1" /> 대기중
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 font-bold hover:bg-emerald-200">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 답변완료
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="text-slate-600 border-slate-200">
                                            {getTypeKorean(inquiry.type)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center text-sm font-bold text-slate-800 line-clamp-1">
                                        <Building2 className="w-4 h-4 text-slate-400 mr-1.5" />
                                        {inquiry.company?.name} <span className="text-slate-400 font-normal ml-1">#{inquiry.company?.code}</span>
                                    </div>
                                    {inquiry.type === 'point' && inquiry.company && (
                                        <div className="text-xs text-indigo-600 font-medium mt-1 ml-5.5">
                                            현재 보유: {inquiry.company.points?.toLocaleString()} P
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1">
                                <div className="bg-slate-50 rounded p-3 text-sm text-slate-700 border border-slate-100 min-h-[100px] whitespace-pre-wrap leading-relaxed">
                                    {inquiry.content}
                                </div>
                            </div>
                            
                            {/* Footer & Actions */}
                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 mt-auto flex items-end justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center text-xs text-slate-500">
                                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                        접수: {new Date(inquiry.created_at).toLocaleString()}
                                    </div>
                                    {inquiry.resolved_at && (
                                        <div className="flex items-center text-xs text-emerald-600">
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                            처리: {new Date(inquiry.resolved_at).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                
                                {inquiry.status === 'pending' && (
                                    <Button 
                                        size="sm" 
                                        className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                                        onClick={() => handleResolve(inquiry.id)}
                                        disabled={resolvingId === inquiry.id}
                                    >
                                        {resolvingId === inquiry.id ? '처리 중...' : '처리 완료하기'}
                                    </Button>
                                )}
                            </div>

                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
