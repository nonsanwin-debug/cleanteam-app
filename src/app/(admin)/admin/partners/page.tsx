'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Building2, Loader2, Search, UserPlus, Trash2, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
    searchCompanyByCode,
    enableCompanySharing,
    disableCompanySharing,
    getSharingPartners,
    getMyCompanyCode
} from '@/actions/shared-orders'

export default function PartnersPage() {
    const [partners, setPartners] = useState<any[]>([])
    const [myCode, setMyCode] = useState<{ code: string; name: string; id: string } | null>(null)
    const [loading, setLoading] = useState(true)

    // 추가 상태
    const [addInput, setAddInput] = useState('')
    const [searching, setSearching] = useState(false)
    const [searchResult, setSearchResult] = useState<any>(null)
    const [searchError, setSearchError] = useState('')
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const [partnerList, codeInfo] = await Promise.all([
            getSharingPartners(),
            getMyCompanyCode()
        ])
        setPartners(partnerList)
        setMyCode(codeInfo)
        setLoading(false)
    }

    async function handleSearch() {
        if (!addInput.trim()) {
            toast.error('업체이름#코드 형식으로 입력하세요.')
            return
        }
        setSearching(true)
        setSearchResult(null)
        setSearchError('')

        const result = await searchCompanyByCode(addInput.trim())
        if (result.found && result.company) {
            setSearchResult(result.company)
            setSearchError('')
        } else {
            setSearchResult(null)
            setSearchError(result.error || '존재하지 않는 업체입니다.')
        }
        setSearching(false)
    }

    async function handleAdd(companyId: string) {
        setAdding(true)
        const result = await enableCompanySharing(companyId)
        if (result.success) {
            toast.success('업체가 추가되었습니다.')
            setSearchResult(null)
            setAddInput('')
            loadData()
        } else {
            toast.error(result.error)
        }
        setAdding(false)
    }

    async function handleRemove(companyId: string) {
        if (!confirm('이 업체를 목록에서 제거하시겠습니까?')) return
        const result = await disableCompanySharing(companyId)
        if (result.success) {
            toast.success('업체가 제거되었습니다.')
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    function copyMyCode() {
        if (myCode) {
            navigator.clipboard.writeText(`${myCode.name}#${myCode.code}`)
            toast.success('내 업체 코드가 복사되었습니다.')
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold tracking-tight flex items-center">
                    <Building2 className="mr-2" /> 업체 관리
                </h2>
                <div className="flex items-center justify-center p-10">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center">
                    <Building2 className="mr-2" /> 업체 관리
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    오더 공유에 참여할 업체를 추가합니다.
                </p>
            </div>

            {/* 내 업체 코드 */}
            {myCode && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-blue-600 font-medium mb-1">내 업체 코드</p>
                                <p className="text-2xl font-bold text-blue-800 tracking-wider">
                                    {myCode.name}#{myCode.code}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100" onClick={copyMyCode}>
                                <Copy className="h-4 w-4 mr-1" /> 복사
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 업체 추가 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <UserPlus className="h-5 w-5 mr-2" />
                        업체 추가
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={addInput}
                            onChange={e => { setAddInput(e.target.value); setSearchError(''); setSearchResult(null) }}
                            placeholder="예: 더클린#6382"
                            className="flex-1"
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={searching} className="px-6">
                            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                    </div>
                    <p className="text-xs text-slate-400">업체이름#코드 형식으로 입력 후 검색하세요.</p>

                    {/* 에러 메시지 */}
                    {searchError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                            <p className="text-sm text-red-700 font-medium">{searchError}</p>
                        </div>
                    )}

                    {/* 검색 결과 */}
                    {searchResult && (
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                                    {(searchResult.name || '?')[0]}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">{searchResult.name}</p>
                                    <p className="text-xs text-slate-500">{searchResult.name}#{searchResult.code}</p>
                                </div>
                            </div>
                            {searchResult.sharing_enabled ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">이미 등록됨</Badge>
                            ) : (
                                <Button size="sm" onClick={() => handleAdd(searchResult.id)} disabled={adding}>
                                    {adding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
                                    추가
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 등록된 업체 목록 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                        등록된 업체 ({partners.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {partners.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>등록된 업체가 없습니다.</p>
                            <p className="text-xs mt-1">위에서 업체이름#코드를 입력하여 추가하세요.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {partners.map((company) => (
                                <div key={company.id} className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                            {(company.name || '?')[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{company.name}</p>
                                            <p className="text-xs text-slate-400">{company.name}#{company.code}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleRemove(company.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
