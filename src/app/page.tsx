import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, HardHat, CheckCircle2 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900">
            청소 현장 관리 시스템
          </h1>
          <p className="text-xl text-slate-500">
            현장 작업 표준화 및 스마트 검수 솔루션
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12 w-full max-w-2xl mx-auto">
          {/* Admin Card */}
          <Link href="/auth/login?role=admin" className="block h-full">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-slate-800">
              <CardHeader>
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-6 h-6 text-slate-700" />
                </div>
                <CardTitle className="text-2xl">관리자 로그인</CardTitle>
                <CardDescription>
                  현장 등록, 작업 배정, 실시간 모니터링
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  관리자 페이지 이동
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Worker Card */}
          <Link href="/auth/login?role=worker" className="block h-full">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-blue-600">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HardHat className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">현장 팀장 로그인</CardTitle>
                <CardDescription>
                  작업 시작, 사진 촬영, 체크리스트 제출
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  팀장 앱 시작하기
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-slate-600">
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <h3 className="font-semibold">표준화된 체크리스트</h3>
            <p className="text-sm">매뉴얼화된 청소 기준으로<br />품질을 보장합니다.</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold">GPS</div>
            <h3 className="font-semibold">위치 기반 출석</h3>
            <p className="text-sm">정확한 현장 도착 시간과<br />위치를 기록합니다.</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-purple-600 font-bold">IMG</div>
            <h3 className="font-semibold">사진 검수 시스템</h3>
            <p className="text-sm">작업 전/중/후 사진을<br />실시간으로 공유합니다.</p>
          </div>
        </div>

        <footer className="pt-12 text-sm text-slate-400">
          © 2026 Field Management System. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
