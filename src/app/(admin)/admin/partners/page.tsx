'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, Loader2, Search, UserPlus, Trash2, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
    searchCompanyByCode,
    addPartner,
    removePartner,
    togglePartnerSharing,
    getMyPartners,
    getMyCompanyCode
} from '@/actions/shared-orders'

export default function PartnersPage() {
    const [partners, setPartners] = useState<any[]>([])
    const [myCode, setMyCode] = useState<{ code: string; name: string; id: string } | null>(null)
    const [loading, setLoading] = useState(true)

    // 검색 상태
    const [addInput, setAddInput] = useState('')
    const [searching, setSearching] = useState(false)
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searchError, setSearchError] = useState('')
    const [addingId, setAddingId] = useState<string | null>(null)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const [partnerList, codeInfo] = await Promise.all([
            getMyPartners(),
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
        setSearchResults([])
        setSearchError('')

        const result = await searchCompanyByCode(addInput.trim())
        if (result.found && result.companies.length > 0) {
            setSearchResults(result.companies)
        } else {
            setSearchError(result.error || '존재하지 않는 업체입니다.')
        }
        setSearching(false)
    }

    async function handleAdd(companyId: string) {
        setAddingId(companyId)
        const result = await addPartner(companyId)
        if (result.success) {
            toast.success('업체가 추가되었습니다.')
            setSearchResults([])
            setAddInput('')
            loadData()
        } else {
            toast.error(result.error)
        }
        setAddingId(null)
    }

    async function handleRemove(partnerCompanyId: string) {
        if (!confirm('이 업체를 목록에서 제거하시겠습니까?')) return
        const result = await removePartner(partnerCompanyId)
        if (result.success) {
            toast.success('업체가 제거되었습니다.')
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    async function handleToggle(partnerCompanyId: string, currentActive: boolean) {
        setTogglingId(partnerCompanyId)
        const result = await togglePartnerSharing(partnerCompanyId, !currentActive)
        if (result.success) {
            setPartners(prev => prev.map(p =>
                p.partner_company_id === partnerCompanyId
                    ? { ...p, sharing_active: !currentActive }
                    : p
            ))
            toast.success(!currentActive ? '공유가 활성화되었습니다.' : '공유가 비활성화되었습니다.')
        } else {
            toast.error(result.error)
        }
        setTogglingId(null)
    }

    function copyMyCode() {
        if (myCode) {
            navigator.clipboard.writeText(`${myCode.name}#${myCode.code}`)
            toast.success('내 업체 코드가 복사되었습니다.')
        }
    }

    // 이미 등록된 파트너인지 확인
    function isAlreadyPartner(companyId: string) {
        return partners.some(p => p.partner_company_id === companyId)
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
                    오더 공유에 참여할 업체를 추가하고 공유를 관리합니다.
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

            {/* 업체 검색/추가 */}
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
                            onChange={e => { setAddInput(e.target.value); setSearchError(''); setSearchResults([]) }}
                            placeholder="예: 클린체크#0000"
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
                    {searchResults.length > 0 && (
                        <div className="space-y-2">
                            {searchResults.length > 1 && (
                                <p className="text-xs text-amber-600 font-medium">
                                    동일 코드의 업체가 {searchResults.length}개 검색되었습니다. 추가할 업체를 선택하세요.
                                </p>
                            )}
                            {searchResults.map((company) => (
                                <div key={company.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                                            {(company.name || '?')[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{company.name}</p>
                                            <p className="text-xs text-slate-500">{company.name}#{company.code}</p>
                                        </div>
                                    </div>
                                    {isAlreadyPartner(company.id) ? (
                                        <span className="text-xs text-green-600 font-medium bg-green-100 px-3 py-1 rounded-full">이미 등록됨</span>
                                    ) : (
                                        <Button size="sm" onClick={() => handleAdd(company.id)} disabled={addingId === company.id}>
                                            {addingId === company.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
                                            추가
                                        </Button>
                                    )}
                                </div>
                            ))}
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
                            {partners.map((partner) => (
                                <div key={partner.id} className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${partner.sharing_active
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                            }`}>
                                            {(partner.name || '?')[0]}
                                        </div>
                                        <div>
                                            <p className={`font-semibold ${partner.sharing_active ? 'text-slate-800' : 'text-slate-400'}`}>
                                                {partner.name}
                                            </p>
                                            <p className="text-xs text-slate-400">{partner.name}#{partner.code}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* 공유 토글 스위치 */}
                                        <button
                                            onClick={() => handleToggle(partner.partner_company_id, partner.sharing_active)}
                                            disabled={togglingId === partner.partner_company_id}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${partner.sharing_active ? 'bg-blue-600' : 'bg-gray-300'
                                                }`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${partner.sharing_active ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                        </button>
                                        <span className={`text-xs font-medium min-w-[32px] ${partner.sharing_active ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {partner.sharing_active ? 'ON' : 'OFF'}
                                        </span>
                                        {/* 삭제 버튼 */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemove(partner.partner_company_id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
