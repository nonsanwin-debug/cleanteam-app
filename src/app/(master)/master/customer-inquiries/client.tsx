'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { updateCustomerInquiryStatus, deleteCustomerInquiry } from '@/actions/customer-booking'
import { Search, MapPin, Calendar, Clock, Phone, Home, Sparkles, Building2, Eye, Trash2, CheckSquare, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function MasterCustomerInquiriesClient({ initialInquiries }: { initialInquiries: any[] }) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'pending' | 'contacted' | 'completed' | 'cancelled'>('pending')
    
    const [viewingInquiry, setViewingInquiry] = useState<any | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleStatusChange = async (id: string, newStatus: string) => {
        const res = await updateCustomerInquiryStatus(id, newStatus)
        if (res.success) {
            toast.success('상태가 업데이트 되었습니다.')
            setViewingInquiry({ ...viewingInquiry, status: newStatus })
            router.refresh()
        } else {
            toast.error(res.error || '오류가 발생했습니다.')
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        const res = await deleteCustomerInquiry(deletingId)
        if (res.success) {
            toast.success('접수 내역이 삭제되었습니다.')
            setDeletingId(null)
            if (viewingInquiry?.id === deletingId) setViewingInquiry(null)
            router.refresh()
        } else {
            toast.error(res.error || '삭제 중 오류가 발생했습니다.')
        }
    }

    const filteredInquiries = initialInquiries.filter(i => {
        const lower = searchTerm.toLowerCase()
        const matchesSearch = lower === '' || 
            (i.customer_name && i.customer_name.toLowerCase().includes(lower)) || 
            (i.address && i.address.toLowerCase().includes(lower)) ||
            (i.customer_phone && i.customer_phone.replace(/-/g, '').includes(lower.replace(/-/g, '')))
            
        return matchesSearch && i.status === activeTab
    })

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return '새로운 접수'
            case 'contacted': return '상담/안내 완료'
            case 'assigned': return '업체 배정'
            case 'completed': return '작업 완료'
            case 'cancelled': return '접수 취소'
            default: return status
        }
    }

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        고객 문의 (직접 접수) 목록
                    </CardTitle>
                    <CardDescription className="mt-1">
                        /book 페이지에서 고객이 직접 신청한 견적 문의입니다.
                    </CardDescription>
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input 
                        placeholder="이름, 연락처, 주소 검색"
                        className="pl-10 h-10 w-full bg-white border-slate-200 shadow-sm text-sm rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                
                {/* Tabs */}
                <div className="flex bg-slate-100/50 p-1 rounded-xl w-full max-w-2xl overflow-x-auto scroller-hide">
                    {[
                        { id: 'pending', name: '새로운 문의' },
                        { id: 'contacted', name: '상담 완료' },
                        { id: 'completed', name: '처리 완료' },
                        { id: 'cancelled', name: '취소됨' }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            className={cn(
                                "flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all", 
                                activeTab === tab.id 
                                    ? "bg-white text-rose-600 shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                            onClick={() => setActiveTab(tab.id as any)}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto bg-white border border-slate-100 rounded-lg shadow-sm">
                    <table className="w-full text-left align-middle border-collapse relative">
                        <thead>
                            <tr className="border-b bg-slate-50 h-12">
                                <th className="p-3 pl-4 font-semibold text-xs text-slate-600 min-w-[100px]">접수일</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 min-w-[120px]">고객 정보</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 min-w-[180px]">주소 / 일정</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 min-w-[120px]">청소 종류</th>
                                <th className="p-3 font-semibold text-xs text-slate-600 text-center min-w-[120px]">액션</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredInquiries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400">
                                        <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        조회된 문의 내역이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredInquiries.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setViewingInquiry(item)}>
                                        <td className="p-4 py-3 text-sm text-slate-500">
                                            {format(new Date(item.created_at), 'MM/dd HH:mm')}
                                            {item.status === 'pending' && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-rose-500"></span>}
                                        </td>
                                        <td className="p-4 py-3">
                                            <div className="font-bold text-slate-800">{item.customer_name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{item.customer_phone}</div>
                                        </td>
                                        <td className="p-4 py-3">
                                            <div className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                                                {item.address} {item.detail_address && `(${item.detail_address})`}
                                            </div>
                                            <div className="text-xs text-teal-600 font-medium mt-1">
                                                {item.work_date} · {item.time_preference}
                                            </div>
                                        </td>
                                        <td className="p-4 py-3 text-sm">
                                            <div className="font-semibold text-slate-800">{item.clean_type}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{item.structure_type} · {item.area_size}</div>
                                        </td>
                                        <td className="p-4 py-3 text-center">
                                            <Button size="sm" variant="outline" className="h-8 shadow-sm">상세 보기</Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>

            {/* Viewer Dialog */}
            <Dialog open={!!viewingInquiry} onOpenChange={(open) => !open && setViewingInquiry(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {viewingInquiry && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black text-slate-900 border-b pb-4 flex items-center justify-between">
                                    고객 견적 문의 상세 내용
                                    <Badge variant="outline" className={cn(
                                        "px-3 py-1",
                                        viewingInquiry.status === 'pending' && "border-rose-500 text-rose-600 bg-rose-50",
                                        viewingInquiry.status === 'contacted' && "border-blue-500 text-blue-600 bg-blue-50",
                                        viewingInquiry.status === 'completed' && "border-teal-500 text-teal-600 bg-teal-50",
                                    )}>
                                        {getStatusText(viewingInquiry.status)}
                                    </Badge>
                                </DialogTitle>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                                            <User className="w-4 h-4" /> 연락처 정보
                                        </h4>
                                        <p className="font-bold text-lg">{viewingInquiry.customer_name}</p>
                                        <p className="text-slate-600 font-medium flex items-center gap-2 mt-1">
                                            <Phone className="w-4 h-4 text-slate-400" /> {viewingInquiry.customer_phone}
                                        </p>
                                    </div>
                                    
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                                            <Sparkles className="w-4 h-4 text-blue-500" /> 청소 정보
                                        </h4>
                                        <div className="space-y-2 text-sm font-semibold">
                                            <p className="flex justify-between"><span className="text-slate-500 font-normal">종류:</span> {viewingInquiry.clean_type}</p>
                                            <p className="flex justify-between"><span className="text-slate-500 font-normal">건물 형태:</span> {viewingInquiry.structure_type}</p>
                                            <p className="flex justify-between"><span className="text-slate-500 font-normal">건물 상태:</span> {viewingInquiry.building_condition}</p>
                                            <p className="flex justify-between"><span className="text-slate-500 font-normal">평수:</span> {viewingInquiry.area_size}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                                            <MapPin className="w-4 h-4" /> 현장 주소 & 일정
                                        </h4>
                                        <p className="font-bold text-slate-800">{viewingInquiry.address}</p>
                                        <p className="text-slate-600 text-sm mt-0.5">{viewingInquiry.detail_address}</p>
                                        
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <div className="flex gap-4">
                                                <div>
                                                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> 날짜</div>
                                                    <div className="font-bold text-teal-700">{viewingInquiry.work_date}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> 시간</div>
                                                    <div className="font-bold text-teal-700">{viewingInquiry.time_preference}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h4 className="font-bold text-slate-700 mb-2">고객 메모 및 첨부사진</h4>
                                        <div className="min-h-[80px] text-sm text-slate-600 bg-white border border-slate-200 rounded p-3 whitespace-pre-wrap">
                                            {viewingInquiry.notes || '작성된 내용이 없습니다.'}
                                        </div>
                                        
                                        {viewingInquiry.image_urls && viewingInquiry.image_urls.length > 0 && (
                                            <div className="flex gap-2 mt-4 overflow-x-auto py-1">
                                                {viewingInquiry.image_urls.map((url: string, i: number) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0 group relative w-20 h-20 bg-slate-200 rounded-lg overflow-hidden border border-slate-300">
                                                        <img src={url} alt={`첨부 ${i}`} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Eye className="text-white w-5 h-5" />
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-2 justify-end pt-4 border-t border-slate-100">
                                <Button 
                                    variant="outline" 
                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => setDeletingId(viewingInquiry.id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> 삭제
                                </Button>
                                
                                {viewingInquiry.status !== 'cancelled' && (
                                    <Button onClick={() => handleStatusChange(viewingInquiry.id, 'cancelled')} variant="outline">
                                        취소/무효 처리
                                    </Button>
                                )}
                                
                                {viewingInquiry.status === 'pending' && (
                                    <Button onClick={() => handleStatusChange(viewingInquiry.id, 'contacted')} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        응대 완료 (상담처리)
                                    </Button>
                                )}
                                
                                {(viewingInquiry.status === 'contacted' || viewingInquiry.status === 'pending') && (
                                    <Button onClick={() => handleStatusChange(viewingInquiry.id, 'completed')} className="bg-teal-600 hover:bg-teal-700 text-white">
                                        현장 접수 완료
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Alert Dialog */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>모든 문의 기록이 지워집니다.</AlertDialogTitle>
                        <AlertDialogDescription>
                            정말로 삭제하시겠습니까? 관련 사진 데이터 및 문의 텍스트가 영구적으로 지워집니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제 확인</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
