'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Loader2, RefreshCw, Shield, Gift } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export default function MasterSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        global_free_old_building: false,
        global_free_interior: false,
    })

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
        </div>
    )
}
