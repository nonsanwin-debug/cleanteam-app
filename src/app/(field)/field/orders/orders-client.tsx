'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CheckCircle2, Clock, CheckSquare, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

export function FieldOrdersClient({ initialOrders }: { initialOrders: any[] }) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'done'>('all')

    const filteredOrders = initialOrders.filter(order => {
        // Tab Filter
        let isMatchTab = true
        const isDone = order.status === 'transferred' && order.transferred_site?.status === 'completed'
        
        if (activeTab === 'ongoing') isMatchTab = !isDone
        if (activeTab === 'done') isMatchTab = isDone

        // Search Filter
        const searchTarget = `${order.region} ${order.address} ${order.work_date}`.toLowerCase()
        const isMatchSearch = searchTarget.includes(searchTerm.toLowerCase())

        return isMatchTab && isMatchSearch
    })

    return (
        <div className="flex flex-col min-h-screen pb-20 bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between">
                <div className="font-bold text-slate-800 text-lg">내 오더 관리</div>
            </header>

            <main className="flex-1 p-4 space-y-4">
                
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input 
                        placeholder="주소나 날짜로 검색" 
                        className="pl-10 h-12 bg-white rounded-xl shadow-sm border-transparent focus:border-teal-500 text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                    {['all', 'ongoing', 'done'].map((tab) => (
                        <button
                            key={tab}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                                activeTab === tab 
                                    ? 'bg-white text-teal-700 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            onClick={() => setActiveTab(tab as any)}
                        >
                            {tab === 'all' && '전체 목록'}
                            {tab === 'ongoing' && '진행 중'}
                            {tab === 'done' && '완료됨'}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="space-y-3 pt-2">
                    {filteredOrders.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">조건에 맞는 오더가 없습니다.</p>
                        </div>
                    ) : (
                        filteredOrders.map(order => {
                            let statusText = '대기중'
                            let statusColor = 'bg-blue-100 text-blue-700'
                            let Icon = Clock
                            let isDone = false
                            
                            if (order.status === 'accepted') {
                                statusText = '업체 매칭됨'
                                statusColor = 'bg-orange-100 text-orange-700'
                            } else if (order.status === 'transferred') {
                                if (order.transferred_site?.status === 'completed') {
                                    statusText = '작업 완료'
                                    statusColor = 'bg-slate-100 text-slate-600'
                                    Icon = CheckCircle2
                                    isDone = true
                                } else {
                                    statusText = '현장 진행 중'
                                    statusColor = 'bg-teal-100 text-teal-700'
                                    Icon = Clock
                                }
                            }
                            
                            return (
                                <Card key={order.id} className={`overflow-hidden transition-all ${isDone ? 'opacity-70' : ''}`}>
                                    <CardContent className="p-0">
                                        <div className="p-4 border-b border-slate-50 flex justify-between items-start w-full">
                                            <div className="flex-1 pr-4">
                                                <Badge className={`mb-2 font-medium shadow-none ${statusColor}`}>
                                                    <Icon className="w-3 h-3 mr-1" /> {statusText}
                                                </Badge>
                                                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">
                                                    {order.address || order.region}
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    {order.work_date || '날짜 미정'} · {order.area_size}
                                                </p>
                                            </div>
                                            <div className="text-right whitespace-nowrap">
                                                <span className="text-sm font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg">
                                                    {/* Extract price from region if possible, otherwise just show label */}
                                                    접수됨
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Footer */}
                                        <div className="bg-slate-50 px-4 py-3 flex justify-between items-center text-xs text-slate-500">
                                            <span>제출일: {format(new Date(order.created_at), 'yyyy-MM-dd')}</span>
                                            {order.accepted_company && (
                                                <span className="font-medium flex items-center">
                                                    담당: {order.accepted_company.name}
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>

            </main>
        </div>
    )
}
