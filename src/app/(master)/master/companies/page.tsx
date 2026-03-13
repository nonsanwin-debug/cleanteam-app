'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2 } from "lucide-react"

export default function MasterCompaniesPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">업체 관리</h1>
                    <p className="text-slate-500 mt-1">플랫폼에 등록된 모든 청소 업체를 관리합니다.</p>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        전체 업체 목록
                    </CardTitle>
                    <CardDescription>
                        NEXUS 시스템을 이용 중인 업체 리스트입니다. (기능 준비 중)
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[400px] flex items-center justify-center text-slate-400 font-medium">
                    업체 데이터 연동 및 관리 UI(승인/반려/수정)가 이곳에 구현될 예정입니다.
                </CardContent>
            </Card>
        </div>
    )
}
