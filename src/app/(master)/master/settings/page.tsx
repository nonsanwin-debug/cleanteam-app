'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default function MasterSettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">설정 (마스터)</h1>
                    <p className="text-slate-500 mt-1">NEXUS 서비스의 글로벌 설정 및 정책을 관리합니다.</p>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5 text-slate-600" />
                        플랫폼 전역 설정
                    </CardTitle>
                    <CardDescription>
                        수수료율, 기본 약관, 공지사항 관리 등이 위치할 예정입니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 h-[400px] flex items-center justify-center text-slate-400 font-medium">
                    시스템 공통 환경설정 폼이 이곳에 구현됩니다.
                </CardContent>
            </Card>
        </div>
    )
}
