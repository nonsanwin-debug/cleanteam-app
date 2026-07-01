'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EyeOff, Loader2, Save, Shield } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { getPlatformSettings, updatePlatformSettings } from "@/actions/platform-settings"

export default function MasterLaunchControlPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        hide_wallet_features: false,
        hide_admin_photo_zone_setup: false,
        hide_cleaning_fee_examples: false,
        hide_guide_button: false,
    })

    const supabase = createClient()

    // 설정 로드
    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true)
            try {
                const data = await getPlatformSettings()
                setSettings({
                    hide_wallet_features: data.hide_wallet_features ?? false,
                    hide_admin_photo_zone_setup: data.hide_admin_photo_zone_setup ?? false,
                    hide_cleaning_fee_examples: data.hide_cleaning_fee_examples ?? false,
                    hide_guide_button: data.hide_guide_button ?? false,
                })
            } catch (err) {
                toast.error('설정을 불러오는 중 오류가 발생했습니다.')
            } finally {
                setLoading(false)
            }
        }
        loadSettings()
    }, [])

    // 설정 저장
    const handleSave = async () => {
        setSaving(true)
        try {
            const result = await updatePlatformSettings(settings)
            if (result.success) {
                toast.success('런칭 기능 제어 설정이 저장 및 적용되었습니다.')
            } else {
                toast.error(result.error || '저장에 실패했습니다.')
            }
        } catch (err) {
            toast.error('서버 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <EyeOff className="w-6 h-6 text-slate-500" />
                    런칭 기능 제어 설정
                </h1>
                <div className="flex items-center justify-center h-[300px] text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    설정을 불러오는 중...
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <EyeOff className="w-6 h-6 text-rose-500" />
                        런칭 기능 제어 설정
                    </h1>
                    <p className="text-slate-500 mt-1">초기 런칭 시점의 편의를 위해 지갑, 사진 구역 등 핵심 UI 및 비즈니스 기능의 노출을 숨기거나 복구합니다.</p>
                </div>
                <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 h-11 px-6 shadow-md transition-all"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    설정 전역 저장 및 실시간 반영
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* 기능 숨김 및 런칭 토글 카드 */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            런칭 및 화면 노출 제어
                        </CardTitle>
                        <CardDescription>
                            각 스위치를 켜면 해당 기능이 즉시 감추어집니다. 런칭 이후 비활성화하여 다시 언제든지 복구할 수 있습니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* 관리포인트 & 캐쉬 숨기기 */}
                        <div className="flex items-start justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="flex-1 pr-4">
                                <Label className="text-base font-bold text-slate-800 cursor-pointer" htmlFor="hide-wallet">
                                    관리포인트 & 캐쉬 숨기기
                                </Label>
                                <p className="text-sm text-slate-500 mt-1">
                                    활성화 시 파트너(관리자) 화면에서 지갑(Wallet), 포인트 잔액, 캐쉬 잔액, 충전 및 포인트 전환 메뉴가 모두 숨겨집니다.
                                </p>
                                <p className="text-xs text-indigo-600 font-semibold mt-1.5 leading-normal">
                                    ※ [정산 우회 혜택 적용]: 이 기능이 활성화되면 회사의 포인트 잔액이 0원이어도 팀장/팀원의 작업 완료 시 포인트 정산 지급이 정상 승인 및 처리됩니다.
                                </p>
                            </div>
                            <Switch
                                id="hide-wallet"
                                checked={settings.hide_wallet_features}
                                onCheckedChange={(c) => setSettings(prev => ({ ...prev, hide_wallet_features: c }))}
                            />
                        </div>

                        {/* 사진구역 설정 감추기 */}
                        <div className="flex items-start justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="flex-1 pr-4">
                                <Label className="text-base font-bold text-slate-800 cursor-pointer" htmlFor="hide-photo">
                                    사진 구역 설정 감추기
                                </Label>
                                <p className="text-sm text-slate-500 mt-1">
                                    활성화 시 현장 등록 및 현장 수정 다이얼로그 폼에서 "사진 구역 설정" 섹션(수동 생성, 템플릿 기반 자동 파싱 등)을 가려 파트너의 등록 단계를 간소화합니다.
                                </p>
                            </div>
                            <Switch
                                id="hide-photo"
                                checked={settings.hide_admin_photo_zone_setup}
                                onCheckedChange={(c) => setSettings(prev => ({ ...prev, hide_admin_photo_zone_setup: c }))}
                            />
                        </div>

                        {/* 추가금액 사유 청소 예시 제거 */}
                        <div className="flex items-start justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="flex-1 pr-4">
                                <Label className="text-base font-bold text-slate-800 cursor-pointer" htmlFor="hide-examples">
                                    추가금액 청소 예시 제거
                                </Label>
                                <p className="text-sm text-slate-500 mt-1">
                                    활성화 시 추가금액을 입력하는 텍스트 입력창들의 placeholder 사유 예시 중 "피톤치드", "오염 심함" 등 특정 청소 업종 전용 텍스트를 "추가 작업 내용을 입력하세요" 등 범용적인 사유 문구로 변경합니다.
                                </p>
                            </div>
                            <Switch
                                id="hide-examples"
                                checked={settings.hide_cleaning_fee_examples}
                                onCheckedChange={(c) => setSettings(prev => ({ ...prev, hide_cleaning_fee_examples: c }))}
                            />
                        </div>

                        {/* 서비스 가이드 버튼 숨기기 */}
                        <div className="flex items-start justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="flex-1 pr-4">
                                <Label className="text-base font-bold text-slate-800 cursor-pointer" htmlFor="hide-guide-btn">
                                    서비스 가이드 버튼 숨기기
                                </Label>
                                <p className="text-sm text-slate-500 mt-1">
                                    활성화 시 대시보드 화면 우측 상단의 "서비스 가이드 다시보기" 버튼이 숨겨집니다.
                                </p>
                            </div>
                            <Switch
                                id="hide-guide-btn"
                                checked={settings.hide_guide_button}
                                onCheckedChange={(c) => setSettings(prev => ({ ...prev, hide_guide_button: c }))}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 현재 적용 현황 */}
                <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-amber-600" />
                            실시간 정책 반영 현황 요약
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 text-sm text-amber-700 space-y-1">
                        <p>• <strong>관리포인트 & 캐쉬:</strong> {settings.hide_wallet_features ? '🚫 숨김 적용 중 (잔액 부족 시에도 정산 지급 가능)' : '✅ 정상 노출 중'}</p>
                        <p>• <strong>사진 구역 설정:</strong> {settings.hide_admin_photo_zone_setup ? '🚫 숨김 적용 중' : '✅ 정상 노출 중'}</p>
                        <p>• <strong>추가금액 사유 문구:</strong> {settings.hide_cleaning_fee_examples ? '🧹 청소 예시 감춤 (범용 예시 표시)' : '✅ 청소 예시 노출 중'}</p>
                        <p>• <strong>서비스 가이드 버튼:</strong> {settings.hide_guide_button ? '🚫 숨김 적용 중' : '✅ 정상 노출 중'}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
