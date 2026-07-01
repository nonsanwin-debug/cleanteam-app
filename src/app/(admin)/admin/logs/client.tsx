'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter
} from '@/components/ui/table'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'

interface Log {
    id: string
    user_id: string
    type: 'earning' | 'commission' | 'penalty' | 'withdrawal_request' | 'withdrawal_paid' | 'withdrawal_refund' | 'manual_add' | 'manual_deduct'
    amount: number
    balance_after: number
    description: string
    created_at: string
    user: { name: string }
}

export function AdminLogsClient({ initialLogs }: { initialLogs: any[] }) {
    const [filterType, setFilterType] = useState<string>('all')
    const [searchTerm1, setSearchTerm1] = useState('')
    const [searchTerm2, setSearchTerm2] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const filteredLogs = initialLogs.filter(log => {
        const matchesType = filterType === 'all' || log.type === filterType
        
        const matchesSearch1 = !searchTerm1 || 
            log.description?.toLowerCase().includes(searchTerm1.toLowerCase()) ||
            log.user?.name?.toLowerCase().includes(searchTerm1.toLowerCase())

        const matchesSearch2 = !searchTerm2 || 
            log.description?.toLowerCase().includes(searchTerm2.toLowerCase()) ||
            log.user?.name?.toLowerCase().includes(searchTerm2.toLowerCase())

        // Date Range filter
        let matchesDate = true
        if (startDate || endDate) {
            const logDate = new Date(log.created_at)
            if (startDate) {
                const start = new Date(startDate)
                start.setHours(0, 0, 0, 0)
                matchesDate = matchesDate && logDate >= start
            }
            if (endDate) {
                const end = new Date(endDate)
                end.setHours(23, 59, 59, 999)
                matchesDate = matchesDate && logDate <= end
            }
        }

        return matchesType && matchesSearch1 && matchesSearch2 && matchesDate
    })

    const totalEarning = filteredLogs
        .filter(log => !['manual_deduct', 'penalty', 'withdrawal_paid', 'withdrawal_request'].includes(log.type))
        .reduce((sum, log) => sum + Math.abs(log.amount), 0)

    const totalDeduction = filteredLogs
        .filter(log => ['manual_deduct', 'penalty', 'withdrawal_paid', 'withdrawal_request'].includes(log.type))
        .reduce((sum, log) => sum + Math.abs(log.amount), 0)

    const netTotal = totalEarning - totalDeduction


    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'earning': return <Badge className="bg-green-100 text-green-700">커미션</Badge>
            case 'commission': return <Badge className="bg-green-100 text-green-700">커미션</Badge>
            case 'penalty': return <Badge className="bg-red-100 text-red-700">AS차감</Badge>
            case 'withdrawal_request': return <Badge className="bg-blue-100 text-blue-700">출금요청</Badge>
            case 'withdrawal_paid': return <Badge className="bg-purple-100 text-purple-700">출금완료</Badge>
            case 'withdrawal_refund': return <Badge className="bg-slate-100 text-slate-700">출금반려</Badge>
            case 'manual_add': return <Badge className="bg-emerald-100 text-emerald-700">수동지급</Badge>
            case 'manual_deduct': return <Badge className="bg-orange-100 text-orange-700">수동차감</Badge>
            default: return <Badge variant="outline">{type}</Badge>
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4">
                {/* 3단계 다중 조건 AND 검색 바 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 block">1차 검색어</label>
                        <Input
                            placeholder="작업자명 또는 내용..."
                            value={searchTerm1}
                            onChange={(e) => setSearchTerm1(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 block">2차 검색어 (AND 조건)</label>
                        <Input
                            placeholder="추가 검색어 입력..."
                            value={searchTerm2}
                            onChange={(e) => setSearchTerm2(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 block">기간 설정 (조회 기간)</label>
                        <div className="flex items-center gap-1.5 h-10">
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-white text-xs px-2 py-1 h-9 w-full"
                            />
                            <span className="text-slate-400 text-xs shrink-0 font-medium">~</span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-white text-xs px-2 py-1 h-9 w-full"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 block">유형 필터</label>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="유형 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">전체 유형</SelectItem>
                                <SelectItem value="earning">커미션</SelectItem>
                                <SelectItem value="commission">커미션 (신규)</SelectItem>
                                <SelectItem value="penalty">AS차감</SelectItem>
                                <SelectItem value="withdrawal_request">출금요청</SelectItem>
                                <SelectItem value="withdrawal_paid">출금완료</SelectItem>
                                <SelectItem value="withdrawal_refund">출금반려</SelectItem>
                                <SelectItem value="manual_add">수동지급</SelectItem>
                                <SelectItem value="manual_deduct">수동차감</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 실시간 정산 결과 요약 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/30 border border-indigo-100 rounded-xl p-3.5 sm:p-4 text-center">
                    <div className="flex sm:flex-col justify-between sm:justify-center items-center px-2 py-0.5">
                        <span className="text-xs text-slate-500 font-medium">총 지급/적립액</span>
                        <span className="text-sm sm:text-base font-bold text-green-600 mt-0.5 sm:mt-1">
                            +{totalEarning.toLocaleString()}원
                        </span>
                    </div>
                    <div className="flex sm:flex-col justify-between sm:justify-center items-center px-2 py-0.5 border-t sm:border-t-0 sm:border-l border-indigo-100/50 pt-2 sm:pt-0">
                        <span className="text-xs text-slate-500 font-medium">총 차감/출금액</span>
                        <span className="text-sm sm:text-base font-bold text-red-600 mt-0.5 sm:mt-1">
                            -{totalDeduction.toLocaleString()}원
                        </span>
                    </div>
                    <div className="flex sm:flex-col justify-between sm:justify-center items-center px-2 py-0.5 border-t sm:border-t-0 sm:border-l border-indigo-100 pt-2 sm:pt-0">
                        <span className="text-xs text-slate-500 font-medium">최종 정산 합계 (총액)</span>
                        <span className={`text-sm sm:text-base font-extrabold mt-0.5 sm:mt-1 ${netTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {netTotal >= 0 ? '+' : ''}{netTotal.toLocaleString()}원
                        </span>
                    </div>
                </div>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">일시</TableHead>
                            <TableHead className="w-[100px]">작업자</TableHead>
                            <TableHead className="w-[100px]">유형</TableHead>
                            <TableHead>내용</TableHead>
                            <TableHead className="text-right">변동 금액</TableHead>
                            <TableHead className="text-right">잔액</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    기록된 로그가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                                    </TableCell>
                                    <TableCell className="font-medium">{log.user?.name}</TableCell>
                                    <TableCell>{getTypeBadge(log.type)}</TableCell>
                                    <TableCell className="text-sm">{log.description}</TableCell>
                                    {(() => {
                                        const isDeduct = ['manual_deduct', 'penalty', 'withdrawal_paid', 'withdrawal_request'].includes(log.type)
                                        return (
                                            <TableCell className={`text-right font-medium ${isDeduct ? 'text-red-600' : 'text-green-600'}`}>
                                                {isDeduct ? '-' : '+'}{Math.abs(log.amount).toLocaleString()}원
                                            </TableCell>
                                        )
                                    })()}
                                    <TableCell className="text-right font-semibold text-slate-700">
                                        {log.balance_after.toLocaleString()}원
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    <TableFooter className="bg-slate-50 font-semibold border-t">
                        <TableRow>
                            <TableCell colSpan={4} className="text-left font-bold text-slate-700">
                                📊 검색 결과 요약 합계 (총액)
                            </TableCell>
                            <TableCell className={`text-right font-extrabold text-base ${netTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {netTotal >= 0 ? '+' : ''}{netTotal.toLocaleString()}원
                            </TableCell>
                            <TableCell className="text-right text-xs text-slate-400 font-normal">
                                {filteredLogs.length}건 검색됨
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {/* Mobile View: Card List */}
            <div className="block md:hidden space-y-3">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-white rounded-xl border border-dashed">
                        기록된 로그가 없습니다.
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {filteredLogs.map((log) => {
                                const isDeduct = ['manual_deduct', 'penalty', 'withdrawal_paid', 'withdrawal_request'].includes(log.type)
                                return (
                                    <div key={log.id} className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                                        {/* Header: Date & Badge */}
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                                            </span>
                                            {getTypeBadge(log.type)}
                                        </div>
                                        {/* Body: Worker & Description */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                                                <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium">작업자</span>
                                                <span>{log.user?.name}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-normal pl-0.5 break-keep">
                                                {log.description}
                                            </p>
                                        </div>
                                        {/* Footer: Amount & Balance */}
                                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                                            <div className="text-left">
                                                <span className="text-[10px] text-slate-400 block font-medium">잔액</span>
                                                <span className="text-xs font-bold text-slate-700">
                                                    {log.balance_after.toLocaleString()}원
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-400 block font-medium">변동 금액</span>
                                                <span className={`text-sm font-extrabold ${isDeduct ? 'text-red-600' : 'text-green-600'}`}>
                                                    {isDeduct ? '-' : '+'}{Math.abs(log.amount).toLocaleString()}원
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Mobile Summary Box */}
                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-2 mt-4 shadow-sm">
                            <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                                <span>검색 결과 건수</span>
                                <span>{filteredLogs.length}건 검색됨</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-200/80 pt-2.5 mt-1">
                                <span className="text-xs font-bold text-slate-700">📊 검색 합계 (총액)</span>
                                <span className={`text-sm sm:text-base font-extrabold ${netTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {netTotal >= 0 ? '+' : ''}{netTotal.toLocaleString()}원
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
