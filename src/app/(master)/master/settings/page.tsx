'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Loader2, RefreshCw, Shield, Gift, Eye, EyeOff, Search, Building2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { getFeedSitesList, toggleFeedVisibility } from "@/actions/master-feed"

type FeedSiteItem = {
    id: string
    name: string
    address: string
    cleaning_date: string | null
    hidden_from_feed: boolean
    company_name: string
}

export default function MasterSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        global_free_old_building: false,
        global_free_interior: false,
    })

    // 피드 관리 상태
    const [feedSites, setFeedSites] = useState<FeedSiteItem[]>([])
    const [feedLoading, setFeedLoading] = useState(true)
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [feedSearch, setFeedSearch] = useState('')

    const supabase = createClient()

    // 설정 로드
    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('platform_settings')
                .select('global_free_old_building, global_free_interior')
                .limit(1)
                .single()

            if (data) {
                setSettings({
                    global_free_old_building: data.global_free_old_building ?? false,
                    global_free_interior: data.global_free_interior ?? false,
                })
            }
            setLoading(false)
        }
        fetchSettings()
    }, [])

    // 피드 현장 로드
    useEffect(() => {
        const loadFeedSites = async () => {
            setFeedLoading(true)
            const data = await getFeedSitesList()
            setFeedSites(data)
            setFeedLoading(false)
        }
        loadFeedSites()
    }, [])

    // 설정 저장
    const handleSave = async () => {
        setSaving(true)
        try {
            const { updatePlatformSettings } = await import('@/actions/platform-settings')
            const result = await updatePlatformSettings(settings)
            if (result.success) {
                toast.success('전역 설정이 저장되었습니다.')
            } else {
                toast.error(result.error || '저장에 실패했습니다.')
            }
        } catch (err) {
            toast.error('서버 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // 피드 토글
    const handleToggleFeed = async (siteId: string, currentHidden: boolean) => {
        setTogglingId(siteId)
        const result = await toggleFeedVisibility(siteId, !currentHidden)
        if (result.success) {
            setFeedSites(prev => prev.map(s => 
                s.id === siteId ? { ...s, hidden_from_feed: !currentHidden } : s
            ))
            toast.success(!currentHidden ? '피드에서 숨김 처리됨' : '피드에 노출됨')
        } else {
            toast.error('변경 실패')
        }
        setTogglingId(null)
    }

    const filteredFeedSites = feedSites.filter(s => {
        if (!feedSearch) return true
        const q = feedSearch.toLowerCase()
        return s.address.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.company_name.toLowerCase().includes(q)
    })

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
                        <Gift className="w-5 h-5 text-amber-500" />
                        전역 할증 무료 설정
                    </CardTitle>
                    <CardDescription>
                        아래 설정을 켜면, 개별 파트너 혜택 설정과 관계없이 <strong>모든 파트너</strong>에게 해당 할증이 무료로 적용됩니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-[200px] text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            설정을 불러오는 중...
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* 구축 할증 무료 */}
                            <div className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                                <div className="flex-1">
                                    <Label className="text-base font-bold text-slate-800">구축 할증 무료 (전역)</Label>
                                    <p className="text-sm text-slate-500 mt-1">
                                        모든 파트너가 의뢰 시 건물 상태를 <strong>구축</strong>으로 선택해도 <span className="text-rose-500 font-bold">2,000원/평 추가 할증이 붙지 않습니다.</span>
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1.5">
                                        ※ 개별 파트너 혜택 설정 여부와 관계없이, 이 설정이 켜져 있으면 전체 적용됩니다.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.global_free_old_building}
                                    onCheckedChange={(c) => setSettings(prev => ({ ...prev, global_free_old_building: c }))}
                                />
                            </div>

                            {/* 인테리어 할증 무료 */}
                            <div className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                                <div className="flex-1">
                                    <Label className="text-base font-bold text-slate-800">인테리어 할증 무료 (전역)</Label>
                                    <p className="text-sm text-slate-500 mt-1">
                                        모든 파트너가 의뢰 시 건물 상태를 <strong>인테리어 후</strong>로 선택해도 <span className="text-rose-500 font-bold">4,000원/평 추가 할증이 붙지 않습니다.</span>
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1.5">
                                        ※ 개별 파트너 혜택 설정 여부와 관계없이, 이 설정이 켜져 있으면 전체 적용됩니다.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.global_free_interior}
                                    onCheckedChange={(c) => setSettings(prev => ({ ...prev, global_free_interior: c }))}
                                />
                            </div>

                            {/* 현재 상태 요약 */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-amber-600" />
                                    <span className="text-sm font-bold text-amber-800">현재 전역 정책 상태</span>
                                </div>
                                <div className="text-sm text-amber-700 space-y-1">
                                    <p>• 구축 할증: <strong>{settings.global_free_old_building ? '✅ 전체 무료' : '❌ 개별 업체 설정에 따름'}</strong></p>
                                    <p>• 인테리어 할증: <strong>{settings.global_free_interior ? '✅ 전체 무료' : '❌ 개별 업체 설정에 따름'}</strong></p>
                                </div>
                            </div>

                            {/* 저장 버튼 */}
                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <Button
                                    className="bg-slate-800 hover:bg-slate-900 text-white px-8 h-11"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                    전역 설정 저장
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 파트너 피드 현장 관리 */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Eye className="w-5 h-5 text-teal-500" />
                        파트너 피드 현장 관리
                    </CardTitle>
                    <CardDescription>
                        파트너 홈 화면에 표시되는 현장을 관리합니다. 숨기기를 누르면 파트너에게 해당 현장이 보이지 않습니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                    {feedLoading ? (
                        <div className="flex items-center justify-center h-[100px] text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            현장 목록을 불러오는 중...
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* 검색 */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={feedSearch}
                                    onChange={e => setFeedSearch(e.target.value)}
                                    placeholder="주소, 현장명, 업체명 검색..."
                                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                                />
                            </div>

                            {/* 요약 */}
                            <div className="flex gap-3 text-xs">
                                <Badge variant="outline" className="gap-1">
                                    <Eye className="w-3 h-3" /> 노출: {feedSites.filter(s => !s.hidden_from_feed).length}건
                                </Badge>
                                <Badge variant="outline" className="gap-1 text-rose-600 border-rose-200">
                                    <EyeOff className="w-3 h-3" /> 숨김: {feedSites.filter(s => s.hidden_from_feed).length}건
                                </Badge>
                            </div>

                            {/* 현장 목록 */}
                            <div className="max-h-[500px] overflow-y-auto space-y-2">
                                {filteredFeedSites.map(site => (
                                    <div
                                        key={site.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                            site.hidden_from_feed 
                                                ? 'bg-rose-50/50 border-rose-200 opacity-60' 
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0 mr-3">
                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                {site.address}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                <span>{site.cleaning_date || '날짜 미정'}</span>
                                                <span className="flex items-center gap-0.5">
                                                    <Building2 className="w-3 h-3" />
                                                    {site.company_name}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={site.hidden_from_feed ? "outline" : "destructive"}
                                            className="shrink-0 h-8 text-xs"
                                            disabled={togglingId === site.id}
                                            onClick={() => handleToggleFeed(site.id, site.hidden_from_feed)}
                                        >
                                            {togglingId === site.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : site.hidden_from_feed ? (
                                                <><Eye className="w-3 h-3 mr-1" /> 노출</>
                                            ) : (
                                                <><EyeOff className="w-3 h-3 mr-1" /> 숨기기</>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                                {filteredFeedSites.length === 0 && (
                                    <p className="text-center text-sm text-slate-400 py-6">검색 결과가 없습니다.</p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
