'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { deleteUserForce } from '@/actions/master'
import { Trash2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MasterUsersClient({ initialUsers }: { initialUsers: any[] }) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`[경고] 정말로 ${userName} 회원을 강제 탈퇴시키겠습니까?\n이 작업은 즉시 로그인 권한을 박탈하며 복구할 수 없습니다.`)) return

        setIsUpdating(true)
        const result = await deleteUserForce(userId)
        setIsUpdating(false)

        if (result.success) {
            alert('해당 회원이 강제 탈퇴 처리되었습니다.')
            router.refresh()
        } else {
            alert(result.error || '오류가 발생했습니다.')
        }
    }

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    전체 회원 목록
                </CardTitle>
                <CardDescription>
                    NEXUS 시스템에 등록된 모든 회원 리스트입니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left align-middle border-collapse">
                        <thead>
                            <tr className="border-b bg-slate-50/50">
                                <th className="p-4 font-medium text-slate-500 w-[150px]">이름</th>
                                <th className="p-4 font-medium text-slate-500 w-[120px]">계정 역할</th>
                                <th className="p-4 font-medium text-slate-500 w-[200px]">소속 업체명</th>
                                <th className="p-4 font-medium text-slate-500 w-[100px]">상태</th>
                                <th className="p-4 font-medium text-slate-500 w-[150px]">전화번호</th>
                                <th className="p-4 font-medium text-slate-500 w-[200px]">가입일</th>
                                <th className="p-4 font-medium text-slate-500 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {initialUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-900">{user.name}</td>
                                    <td className="p-4">
                                        {user.role === 'master' && <Badge variant="outline" className="text-purple-600 bg-purple-50">마스터</Badge>}
                                        {user.role === 'admin' && <Badge variant="outline" className="text-indigo-600 bg-indigo-50">업체 관리자</Badge>}
                                        {user.role === 'worker' && <Badge variant="outline" className="text-slate-600 bg-slate-50">작업자</Badge>}
                                    </td>
                                    <td className="p-4 text-slate-600 font-medium">
                                        {user.companies ? user.companies.name : '-'}
                                    </td>
                                    <td className="p-4">
                                        {user.status === 'active' && <Badge variant="outline" className="text-green-600 bg-green-50">정상</Badge>}
                                        {user.status === 'pending' && <Badge variant="outline" className="text-amber-600 bg-amber-50">대기</Badge>}
                                        {user.status === 'deleted' && <Badge variant="outline" className="text-red-600 bg-red-50">탈퇴</Badge>}
                                        {(!user.status && user.role !== 'master') && <Badge variant="outline" className="text-slate-600 bg-slate-50">미확인</Badge>}
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {user.phone || '-'}
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')}
                                    </td>
                                    <td className="p-4 text-right">
                                        {(user.role !== 'master' && user.status !== 'deleted') && (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" 
                                                onClick={() => handleDeleteUser(user.id, user.name)} 
                                                disabled={isUpdating}
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                강제 탈퇴
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {initialUsers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        가입된 회원이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
