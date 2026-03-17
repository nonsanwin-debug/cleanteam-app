'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquarePlus, Clock, CheckCircle2, Building2, Calendar, Reply } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { resolveInquiry } from '@/actions/inquiries'
import { useRouter } from 'next/navigation'

export function MasterInquiriesClient({ initialInquiries }: { initialInquiries: any[] }) {
    const router = useRouter()
    const [inquiries, setInquiries] = useState(initialInquiries)
    const [resolvingId, setResolvingId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState<Record<string, string>>({})

    const handleResolve = async (id: string) => {
        const reply = replyText[id] || ''
        if (!reply.trim()) {
            if (!confirm('답변 내용이 비어있습니다. 이대로 처리 완료하시겠습니까?')) return
        } else {
            if (!confirm('작성하신 답변과 함께 처리 완료 상태로 변경하시겠습니까?')) return
        }

        setResolvingId(id)
        const result = await resolveInquiry(id, reply)
        setResolvingId(null)

        if (result.success) {
            alert('답변 및 처리가 완료되었습니다.')
            // Optimistic update
            setInquiries(prev => 
                prev.map(inquiry => 
                    inquiry.id === id 
                    ? { ...inquiry, status: 'resolved', reply: reply, resolved_at: new Date().toISOString() } 
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
            case 'notice': return '마스터 발신 메시지'
            default: return t
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <MessageSquarePlus className="w-6 h-6 text-purple-600" />
                    업체 문의 / 메시지 관리
                </h1>
                <p className="text-slate-500 mt-1">
                    업체에서 보낸 문의를 처리하거나 발송한 전체 메시지를 확인합니다.
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
                                {inquiry.type === 'notice' ? (
                                    <div className="bg-indigo-50 rounded p-4 text-sm text-indigo-950 border border-indigo-100 min-h-[100px] whitespace-pre-wrap leading-relaxed">
                                        <div className="text-xs font-bold text-indigo-700 mb-2 flex items-center">
                                            <Reply className="w-3.5 h-3.5 mr-1 scale-x-[-1]" /> 수신처: {inquiry.company?.name || '업체 알 수 없음'}
                                        </div>
                                        {inquiry.content}
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded p-3 text-sm text-slate-700 border border-slate-100 min-h-[100px] whitespace-pre-wrap leading-relaxed">
                                        {inquiry.content}
                                    </div>
                                )}
                            </div>
                            
                            {/* Footer & Actions */}
                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 mt-auto flex flex-col gap-4">
                                {inquiry.status === 'resolved' && inquiry.reply && inquiry.type !== 'notice' && (
                                    <div className="bg-purple-50 border border-purple-100 rounded-md p-3">
                                        <div className="flex items-center text-xs font-bold text-purple-700 mb-1">
                                            <Reply className="w-3.5 h-3.5 mr-1" /> 마스터 답변
                                        </div>
                                        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{inquiry.reply}</div>
                                    </div>
                                )}
                                
                                <div className="flex items-end justify-between gap-4 mt-1">
                                    <div className="space-y-1">
                                        <div className="flex items-center text-xs text-slate-500">
                                            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                            {inquiry.type === 'notice' ? '발송' : '접수'}: {new Date(inquiry.created_at).toLocaleString()}
                                        </div>
                                        {inquiry.resolved_at && inquiry.type !== 'notice' && (
                                            <div className="flex items-center text-xs text-emerald-600">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                처리: {new Date(inquiry.resolved_at).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {inquiry.status === 'pending' && inquiry.type !== 'notice' && (
                                        <div className="flex flex-col gap-2 w-full max-w-[250px]">
                                            <Textarea 
                                                placeholder="답변 내용을 입력하세요..." 
                                                className="text-sm bg-white resize-none min-h-[80px]"
                                                value={replyText[inquiry.id] || ''}
                                                onChange={(e) => setReplyText(prev => ({...prev, [inquiry.id]: e.target.value}))}
                                            />
                                            <div className="flex justify-end">
                                                <Button 
                                                    size="sm" 
                                                    className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                                                    onClick={() => handleResolve(inquiry.id)}
                                                    disabled={resolvingId === inquiry.id}
                                                >
                                                    {resolvingId === inquiry.id ? '처리 중...' : '답변 및 처리 완료'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
