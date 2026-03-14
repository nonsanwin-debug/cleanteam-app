'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { restoreCompany, restoreUser } from '@/actions/master'
import { RefreshCw, Undo2, Building2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MasterRecoveryClient({ initialCompanies, initialUsers }: { initialCompanies: any[], initialUsers: any[] }) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)

    const handleRestoreCompany = async (companyId: string, companyName: string) => {
        if (!confirm(`'${companyName}' 업체를 복구하시겠습니까?\n복구 시 정상 승인 상태로 돌아갑니다.`)) return

        setIsUpdating(true)
        const result = await restoreCompany(companyId)
        setIsUpdating(false)

        if (result.success) {
            alert('업체가 복구되었습니다.')
            router.refresh()
        } else {
            alert(result.error || '오류가 발생했습니다.')
        }
    }

    const handleRestoreUser = async (userId: string, userName: string) => {
        if (!confirm(`'${userName}' 회원을 복구하시겠습니까?\n복구 시 즉시 로그인이 가능한 상태로 돌아갑니다.`)) return

        setIsUpdating(true)
        const result = await restoreUser(userId)
        setIsUpdating(false)

        if (result.success) {
            alert('회원이 복구되었습니다.')
            router.refresh()
        } else {
            alert(result.error || '오류가 발생했습니다.')
        }
    }

    return (
        <Tabs defaultValue="companies" className="space-y-6">
            <TabsList className="bg-slate-200/50 p-1 rounded-lg">
                <TabsTrigger value="companies" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm px-6">
                    <Building2 className="w-4 h-4 mr-2" />
                    삭제된 업체 ({initialCompanies.length})
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm px-6">
                    <Users className="w-4 h-4 mr-2" />
                    탈퇴된 회원 ({initialUsers.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="companies" className="space-y-4 outline-none">
                <Card className="shadow-sm border-rose-100">
                    <CardHeader className="bg-rose-50/50 border-b border-rose-100/50 pb-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            업체 복구 대기열
                        </CardTitle>
                        <CardDescription>
                            삭제된 업체 리스트입니다. 복구 시 <span className="font-semibold text-rose-600">승인 완료</span> 상태로 돌아갑니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle border-collapse">
                                <thead>
                                    <tr className="border-b bg-slate-50/50">
                                        <th className="p-4 font-medium text-slate-500 w-[120px]">코드</th>
                                        <th className="p-4 font-medium text-slate-500 w-[200px]">업체명</th>
                                        <th className="p-4 font-medium text-slate-500 w-[100px]">상태</th>
                                        <th className="p-4 font-medium text-slate-500 w-[150px]">잔여 포인트</th>
                                        <th className="p-4 font-medium text-slate-500 w-[150px]">가입일</th>
                                        <th className="p-4 font-medium text-slate-500 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {initialCompanies.map((company) => (
                                        <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-mono text-slate-600">{company.code || '-'}</td>
                                            <td className="p-4 font-bold text-slate-800 line-through decoration-rose-300">{company.name}</td>
                                            <td className="p-4">
                                                <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200">삭제됨</Badge>
                                            </td>
                                            <td className="p-4 font-medium text-slate-500">
                                                {company.points?.toLocaleString() || 0} P
                                            </td>
                                            <td className="p-4 text-slate-500">
                                                {format(new Date(company.created_at), 'yyyy-MM-dd')}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => handleRestoreCompany(company.id, company.name)} disabled={isUpdating}>
                                                    {isUpdating ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Undo2 className="w-4 h-4 mr-1" />}
                                                    복구하기
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {initialCompanies.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-500 bg-slate-50/50">
                                                휴지통에 삭제된 업체가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4 outline-none">
                <Card className="shadow-sm border-rose-100">
                    <CardHeader className="bg-rose-50/50 border-b border-rose-100/50 pb-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            회원 복구 대기열
                        </CardTitle>
                        <CardDescription>
                            강제 탈퇴된 회원 리스트입니다. 복구 시 <span className="font-semibold text-rose-600">정상 활동 가능</span> 상태로 돌아갑니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle border-collapse">
                                <thead>
                                    <tr className="border-b bg-slate-50/50">
                                        <th className="p-4 font-medium text-slate-500 w-[150px]">이름</th>
                                        <th className="p-4 font-medium text-slate-500 w-[120px]">권한</th>
                                        <th className="p-4 font-medium text-slate-500 w-[200px]">소속 업체</th>
                                        <th className="p-4 font-medium text-slate-500 w-[100px]">상태</th>
                                        <th className="p-4 font-medium text-slate-500 w-[150px]">이메일</th>
                                        <th className="p-4 font-medium text-slate-500 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {initialUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-bold text-slate-800 line-through decoration-rose-300">{user.name}</td>
                                            <td className="p-4">
                                                {user.role === 'admin' ? (
                                                    <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-100">업체 관리자</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200">작업자</Badge>
                                                )}
                                            </td>
                                            <td className="p-4 text-slate-600 font-medium">
                                                {user.companies ? user.companies.name : '-'}
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200">탈퇴됨</Badge>
                                            </td>
                                            <td className="p-4 text-slate-500 text-xs truncate max-w-[150px]">
                                                {user.email || '-'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => handleRestoreUser(user.id, user.name)} disabled={isUpdating}>
                                                    {isUpdating ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Undo2 className="w-4 h-4 mr-1" />}
                                                    복구하기
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {initialUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-500 bg-slate-50/50">
                                                강제 탈퇴된 회원이 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
