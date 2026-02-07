'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export default function WorkerSchedulePage() {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center">
                <Calendar className="mr-2" />
                내 일정
            </h2>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">이번 달 작업 일정</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-slate-500 text-sm">
                        준비 중인 기능입니다.<br />
                        홈 화면에서 오늘의 작업을 확인하세요.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
