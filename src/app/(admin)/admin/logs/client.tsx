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
    TableRow
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
    const [searchTerm, setSearchTerm] = useState('')

    const filteredLogs = initialLogs.filter(log => {
        const matchesType = filterType === 'all' || log.type === filterType
        const matchesSearch = log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesType && matchesSearch
    })

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
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="작업자명 또는 내용 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger>
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

            <div className="border rounded-md">
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
                                                {isDeduct ? '-' : '+'}{log.amount.toLocaleString()}원
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
                </Table>
            </div>
        </div>
    )
}
