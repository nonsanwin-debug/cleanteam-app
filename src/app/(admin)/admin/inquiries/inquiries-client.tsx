'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Plus, MessageSquarePlus, Clock, CheckCircle2, RefreshCw } from 'lucide-react'
import { createInquiry } from '@/actions/inquiries'
import { useRouter } from 'next/navigation'

export function AdminInquiriesClient({ initialInquiries }: { initialInquiries: any[] }) {
    const router = useRouter()
    const [inquiries, setInquiries] = useState(initialInquiries)
    
    useEffect(() => {
        setInquiries(initialInquiries)
    }, [initialInquiries])

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [type, setType] = useState<'general' | 'banner' | 'point'>('general')
    const [content, setContent] = useState('')

    const handleSubmit = async () => {
        if (!content.trim()) {
            alert('문의 내용을 입력해주세요.')
            return
        }

        setIsSubmitting(true)
        const result = await createInquiry({
            type,
            content
        })
        setIsSubmitting(false)

        if (result.success) {
            setIsDialogOpen(false)
            setContent('')
            setType('general')
            alert('문의가 성공적으로 접수되었습니다.')
            router.refresh()
        } else {
            alert(result.error || '문의 접수에 실패했습니다.')
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
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <MessageSquarePlus className="w-6 h-6 text-indigo-600" />
                        1:1 문의 / 요청
                    </h1>
                    <p className="text-slate-500 mt-1">
                        마스터(관리자)에게 배너 광고 등록, 포인트 충전, 기타 문의 사항을 직접 요청할 수 있습니다.
                    </p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" />
                            새 문의 작성
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>1:1 문의 작성</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>문의 유형</Label>
                                <Select value={type} onValueChange={(val: any) => setType(val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="문의 유형 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">일반 문의</SelectItem>
                                        <SelectItem value="banner">배너 광고 요청</SelectItem>
                                        <SelectItem value="point">포인트 충전 요청</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content">문의 내용</Label>
                                <Textarea 
                                    id="content" 
                                    placeholder="요청하실 내용을 상세히 적어주세요." 
                                    rows={6}
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="resize-none"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                                접수하기
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {inquiries.length === 0 ? (
                <Card className="border-dashed bg-slate-50">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <MessageSquarePlus className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">보낸 문의가 없습니다</h3>
                        <p className="text-sm mt-1">상단의 '새 문의 작성' 버튼을 눌러 마스터에게 메시지를 보낼 수 있습니다.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {inquiries.map(inquiry => (
                        <Card key={inquiry.id} className="overflow-hidden bg-white shadow-sm border border-slate-200">
                            <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6">
                                {/* Status Icon & Badge */}
                                <div className="flex flex-col items-start gap-2 min-w-[120px]">
                                    {inquiry.status === 'pending' ? (
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium whitespace-nowrap">
                                            <Clock className="w-3.5 h-3.5 mr-1" /> 대기중
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium whitespace-nowrap">
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 답변완료
                                        </Badge>
                                    )}
                                    <div className="text-xs font-semibold text-slate-500 mt-1">
                                        {getTypeKorean(inquiry.type)}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                        등록: {new Date(inquiry.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-100 min-h-[80px]">
                                    <p className="whitespace-pre-wrap leading-relaxed">{inquiry.content}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
