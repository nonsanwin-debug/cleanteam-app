'use client'

import { CheckCircle, MapPin, Calendar, Phone, User, Sparkles } from 'lucide-react'

export function CustomerOrderComplete({ order }: { order: any }) {
    const parsed = order?.parsed_details || {}

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            {/* Header */}
            <header className="bg-white border-b">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">NEXUS 청소 예약</span>
                    <a href="tel:1644-4354" className="text-xs text-slate-500 font-medium">1644-4354</a>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-4">
                {/* 성공 카드 */}
                <div className="bg-white rounded-2xl border border-emerald-200 p-6 text-center space-y-3">
                    <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">예약 접수 완료!</h1>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        예약이 성공적으로 접수되었습니다.<br/>
                        담당자 배정 후 연락드리겠습니다.
                    </p>
                </div>

                {/* 예약 상세 카드 */}
                {order && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-teal-500" />
                                예약 상세 내역
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {/* 주소 */}
                            <div className="px-4 py-3 flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">주소</p>
                                    <p className="text-sm text-slate-800 font-medium mt-0.5">{order.address}</p>
                                </div>
                            </div>

                            {/* 고객 정보 */}
                            <div className="px-4 py-3 flex items-start gap-3">
                                <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">고객 정보</p>
                                    <p className="text-sm text-slate-800 font-medium mt-0.5">{order.customer_name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{order.customer_phone}</p>
                                </div>
                            </div>

                            {/* 작업일 */}
                            <div className="px-4 py-3 flex items-start gap-3">
                                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">작업 희망일</p>
                                    <p className="text-sm text-slate-800 font-medium mt-0.5">{order.work_date}</p>
                                    {parsed.time_preference && (
                                        <p className="text-xs text-slate-500 mt-0.5">{parsed.time_preference}</p>
                                    )}
                                </div>
                            </div>

                            {/* 청소 종류 */}
                            {parsed.cleaning_type && (
                                <div className="px-4 py-3 flex items-start gap-3">
                                    <Sparkles className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">청소 정보</p>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            <span className="text-xs bg-teal-50 text-teal-700 font-medium px-2 py-0.5 rounded">{parsed.cleaning_type}</span>
                                            {order.area_size && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{order.area_size}평</span>}
                                            {parsed.structure_type && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{parsed.structure_type}</span>}
                                            {parsed.building_condition && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{parsed.building_condition}</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 예상 금액 */}
                            {parsed.estimated_price && (
                                <div className="px-4 py-3 flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-700">예상 금액</span>
                                    <span className="text-lg font-extrabold text-slate-800">
                                        {Number(parsed.estimated_price).toLocaleString()}<span className="text-xs font-medium text-slate-400 ml-0.5">원</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 문의 안내 */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center space-y-2">
                    <p className="text-xs text-slate-500">문의사항이 있으시면 연락해주세요</p>
                    <a 
                        href="tel:1644-4354"
                        className="flex items-center justify-center gap-2 w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors"
                    >
                        <Phone className="w-4 h-4" />
                        1644-4354 전화 문의
                    </a>
                </div>
            </main>
        </div>
    )
}
