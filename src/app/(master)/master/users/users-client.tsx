'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { deleteUserForce } from '@/actions/master'
import { Trash2, Users, ChevronDown, ChevronRight, Building2, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MasterUsersClient({ initialUsers }: { initialUsers: any[] }) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

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

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
    }

    // Grouping and sorting logic
    const { masterGroup, companyGroups, noCompanyGroup } = useMemo(() => {
        const masters: any[] = []
        const noCompany: any[] = []
        const companyMap: Record<string, { id: string, name: string, code: string, status: string, users: any[] }> = {}

        initialUsers.forEach(user => {
            if (user.role === 'master') {
                masters.push(user)
                return
            }

            if (!user.companies) {
                noCompany.push(user)
                return
            }

            const compKey = user.companies.id || user.companies.name // Use name as fallback key
            
            if (!companyMap[compKey]) {
                companyMap[compKey] = {
                    id: user.companies.id,
                    name: user.companies.name,
                    code: user.companies.code,
                    status: user.companies.status,
                    users: []
                }
            }
            companyMap[compKey].users.push(user)
        })

        // Convert the map to an array and sort by number of users descending
        const groupedArray = Object.values(companyMap).sort((a, b) => b.users.length - a.users.length)

        return {
            masterGroup: masters,
            companyGroups: groupedArray,
            noCompanyGroup: noCompany
        }
    }, [initialUsers])


    // Render standard user row
    const UserRow = ({ user }: { user: any }) => (
        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
            <td className="p-4 py-3 font-medium text-slate-900 border-l border-slate-100">{user.name}</td>
            <td className="p-4 py-3">
                {user.role === 'master' && <Badge variant="outline" className="text-purple-600 bg-purple-50">마스터</Badge>}
                {user.role === 'admin' && <Badge variant="outline" className="text-indigo-600 bg-indigo-50">업체 관리자</Badge>}
                {user.role === 'worker' && <Badge variant="outline" className="text-slate-600 bg-slate-50">작업자</Badge>}
            </td>
            <td className="p-4 py-3">
                {user.status === 'active' && <Badge variant="outline" className="text-green-600 bg-green-50">정상</Badge>}
                {user.status === 'pending' && <Badge variant="outline" className="text-amber-600 bg-amber-50">대기</Badge>}
                {user.status === 'deleted' && <Badge variant="outline" className="text-red-600 bg-red-50">탈퇴</Badge>}
                {(!user.status && user.role !== 'master') && <Badge variant="outline" className="text-slate-600 bg-slate-50">미확인</Badge>}
            </td>
            <td className="p-4 py-3 text-slate-500 text-sm">
                {user.phone || '-'}
            </td>
            <td className="p-4 py-3 text-slate-500 text-sm">
                {format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')}
            </td>
            <td className="p-4 py-3 text-right">
                {(user.role !== 'master' && user.status !== 'deleted') && (
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs" 
                        onClick={() => handleDeleteUser(user.id, user.name)} 
                        disabled={isUpdating}
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        탈퇴
                    </Button>
                )}
            </td>
        </tr>
    );

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    전체 회원 관리 (그룹별)
                </CardTitle>
                <CardDescription>
                    NEXUS 시스템에 가입된 회원이 소속 업체별로 {companyGroups.length}개의 그룹으로 나뉘어져 있습니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 bg-slate-50/30">
                
                {/* 1. Master Group */}
                {masterGroup.length > 0 && (
                    <Card className="border-purple-200 overflow-hidden shadow-sm">
                        <div 
                            className="bg-purple-50/50 p-4 border-b border-purple-100 flex items-center justify-between cursor-pointer hover:bg-purple-50 transition-colors"
                            onClick={() => toggleGroup('master')}
                        >
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold text-slate-800 tracking-tight">마스터 계정</h3>
                                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">{masterGroup.length}</Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 pointer-events-none">
                                {expandedGroups['master'] ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                            </Button>
                        </div>
                        {expandedGroups['master'] && (
                            <div className="overflow-x-auto bg-white">
                                <table className="w-full text-left align-middle border-collapse">
                                    <tbody className="divide-y divide-slate-100">
                                        {masterGroup.map(u => <UserRow key={u.id} user={u} />)}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {/* 2. Companies Sorted By User Count */}
                {companyGroups.map((group, idx) => {
                    const isExpanded = expandedGroups[group.name] === undefined ? false : expandedGroups[group.name];
                    return (
                        <Card key={idx} className="border-indigo-100 overflow-hidden shadow-sm transition-all duration-200">
                            <div 
                                className="bg-white p-4 flex items-center justify-between cursor-pointer hover:bg-indigo-50/30 transition-colors"
                                onClick={() => toggleGroup(group.name)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                        <Building2 className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                            {group.name} 
                                            {group.code && <span className="font-mono text-sm font-normal text-slate-400">#{group.code}</span>}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            소속 인원: {group.users.length}명
                                            {group.status === 'pending' && <span className="ml-2 text-amber-600 font-medium">(승인 대기 업체)</span>}
                                            {group.status === 'deleted' && <span className="ml-2 text-red-600 font-medium">(삭제된 업체)</span>}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-2">
                                        {group.users.slice(0, 5).map((u, i) => (
                                            <div key={i} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm ${u.role === 'admin' ? 'bg-indigo-400 z-10' : 'bg-slate-300'}`} title={`${u.name} (${u.role})`}>
                                                {u.name.charAt(0)}
                                            </div>
                                        ))}
                                        {group.users.length > 5 && (
                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm z-0">
                                                +{group.users.length - 5}
                                            </div>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 pointer-events-none">
                                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Users Table */}
                            {isExpanded && (
                                <div className="overflow-x-auto bg-slate-50/50 border-t border-indigo-50">
                                    <table className="w-full text-left align-middle border-collapse">
                                        <thead>
                                            <tr className="border-b bg-indigo-50/50">
                                                <th className="p-3 pl-4 font-semibold text-xs text-indigo-700 w-[150px]">이름</th>
                                                <th className="p-3 font-semibold text-xs text-indigo-700 w-[120px]">계정 역할</th>
                                                <th className="p-3 font-semibold text-xs text-indigo-700 w-[100px]">상태</th>
                                                <th className="p-3 font-semibold text-xs text-indigo-700 w-[150px]">전화번호</th>
                                                <th className="p-3 font-semibold text-xs text-indigo-700 w-[180px]">가입일</th>
                                                <th className="p-3 font-semibold text-xs text-indigo-700 text-right">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {group.users.map(u => <UserRow key={u.id} user={u} />)}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )
                })}

                {/* 3. Unassociated Users */}
                {noCompanyGroup.length > 0 && (
                    <Card className="border-slate-200 overflow-hidden shadow-sm">
                        <div 
                            className="bg-slate-50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => toggleGroup('unassociated')}
                        >
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-slate-500" />
                                <h3 className="font-bold text-slate-700 tracking-tight">소속 미지정 맴버</h3>
                                <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-none">{noCompanyGroup.length}</Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 pointer-events-none">
                                {expandedGroups['unassociated'] ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                            </Button>
                        </div>
                        {expandedGroups['unassociated'] && (
                            <div className="overflow-x-auto bg-white border-t border-slate-100">
                                <table className="w-full text-left align-middle border-collapse">
                                    <tbody className="divide-y divide-slate-100">
                                        {noCompanyGroup.map(u => <UserRow key={u.id} user={u} />)}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {initialUsers.length === 0 && (
                    <div className="p-12 text-center text-slate-500 bg-white rounded-lg border border-dashed border-slate-200">
                        가입된 회원이 없습니다.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

