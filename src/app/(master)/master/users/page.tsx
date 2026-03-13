'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export default function MasterUsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">회원 관리</h1>
                    <p className="text-slate-500 mt-1">플랫폼에 가입된 모든 관리자 및 작업자 계정을 조회하고 관리합니다.</p>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-600" />
                        전체 회원 목록
                    </CardTitle>
                    <CardDescription>
                        NEXUS 시스템에 가입한 전체 유저 데이테입니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[400px] flex items-center justify-center text-slate-400 font-medium">
                    사용자 리스트, 상세 권한 변경, 강제 탈퇴 등의 기능이 추후 제공될 예정입니다.
                </CardContent>
            </Card>
        </div>
    )
}
