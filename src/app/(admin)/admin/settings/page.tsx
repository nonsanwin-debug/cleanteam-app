'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Settings, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getCompanySettings, updateCompanySettings } from '@/actions/admin'

const DEFAULT_TEMPLATE = `고객님 청소는 잘 마무리 되었습니다
아래 계좌번호로 명시된 금액 입금 후
예금주 성함과 함께 문자 부탁드리겠습니다

입금 계좌번호 :
{은행명}
{계좌번호}
잔금 : {잔금}원
추가금 : {추가금}원
합계 : {합계}원

추후 부족하신 부분이나 문제가 있는 부분에 대해서
연락주시면 바로 처리 도와드리겠습니다`

export default function SettingsPage() {
    const [smsEnabled, setSmsEnabled] = useState(false)
    const [smsBankName, setSmsBankName] = useState('')
    const [smsAccountNumber, setSmsAccountNumber] = useState('')
    const [smsMessageTemplate, setSmsMessageTemplate] = useState(DEFAULT_TEMPLATE)
    const [companyCollectionMessage, setCompanyCollectionMessage] = useState('')
    const [promotionEnabled, setPromotionEnabled] = useState(false)
    const [promotionContactNumber, setPromotionContactNumber] = useState('')
    const [companyCode, setCompanyCode] = useState('')
    const [baseUrl, setBaseUrl] = useState('')
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setBaseUrl(typeof window !== 'undefined' ? window.location.origin : '')
        async function loadSettings() {
            const settings = await getCompanySettings()
            if (settings) {
                setSmsEnabled(settings.sms_enabled || false)
                setSmsBankName(settings.sms_bank_name || '')
                setSmsAccountNumber(settings.sms_account_number || '')
                setSmsMessageTemplate(settings.sms_message_template || DEFAULT_TEMPLATE)
                setCompanyCollectionMessage(settings.company_collection_message || '')
                setPromotionEnabled(settings.promotion_page_enabled || false)
                setPromotionContactNumber(settings.promotion_contact_number || '')
                setCompanyCode(settings.code || '')
            }
            setLoading(false)
        }
        loadSettings()
    }, [])

    async function handleSave() {
        setSaving(true)
        try {
            const result = await updateCompanySettings(smsEnabled, smsBankName, smsAccountNumber, smsMessageTemplate, companyCollectionMessage, promotionEnabled, promotionContactNumber)
            if (result.success) {
                toast.success('설정이 저장되었습니다.')
            } else {
                toast.error(result.error || '저장에 실패했습니다.')
            }
        } catch {
            toast.error('저장 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // Build preview by replacing placeholders
    const previewMessage = smsMessageTemplate
        .replace('{은행명}', smsBankName || '(은행명)')
        .replace('{계좌번호}', smsAccountNumber || '(계좌번호)')
        .replace('{잔금}', '500,000')
        .replace('{추가금}', '50,000')
        .replace('{합계}', '550,000')

    if (loading) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold tracking-tight flex items-center">
                    <Settings className="mr-2" />
                    설정
                </h2>
                <div className="flex items-center justify-center p-10">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight flex items-center">
                <Settings className="mr-2" />
                설정
            </h2>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">📱 수금 문자 설정</CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                                팀장수금 시 고객에게 보내는 문자 기능을 설정합니다.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${smsEnabled ? 'text-green-600' : 'text-slate-400'}`}>
                                {smsEnabled ? '사용' : '미사용'}
                            </span>
                            <Switch
                                checked={smsEnabled}
                                onCheckedChange={setSmsEnabled}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {smsEnabled ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">은행명</label>
                                <Input
                                    value={smsBankName}
                                    onChange={(e) => setSmsBankName(e.target.value)}
                                    placeholder="예: 카카오뱅크"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">계좌번호</label>
                                <Input
                                    value={smsAccountNumber}
                                    onChange={(e) => setSmsAccountNumber(e.target.value)}
                                    placeholder="예: 1234-5678-901234"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">문자 내용</label>
                                <Textarea
                                    value={smsMessageTemplate}
                                    onChange={(e) => setSmsMessageTemplate(e.target.value)}
                                    rows={12}
                                    className="text-sm font-mono"
                                />
                                <p className="text-xs text-slate-400">
                                    사용 가능한 변수: <code className="bg-slate-100 px-1 rounded">{'{은행명}'}</code> <code className="bg-slate-100 px-1 rounded">{'{계좌번호}'}</code> <code className="bg-slate-100 px-1 rounded">{'{잔금}'}</code> <code className="bg-slate-100 px-1 rounded">{'{추가금}'}</code> <code className="bg-slate-100 px-1 rounded">{'{합계}'}</code>
                                </p>
                            </div>

                            <div className="bg-slate-50 border rounded-lg p-3 mt-2">
                                <p className="text-xs font-medium text-slate-600 mb-2">📨 미리보기</p>
                                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                                    {previewMessage}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="bg-slate-50 border border-dashed rounded-lg p-6 text-center text-slate-500">
                            <p className="text-sm">수금 문자 기능이 비활성화되어 있습니다.</p>
                            <p className="text-xs mt-1">활성화하면 팀장수금 현장에서 고객에게 문자를 보낼 수 있습니다.</p>
                        </div>
                    )}

                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        저장
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">🏢 업체수금 안내 멘트</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        수금 방식이 &quot;업체수금&quot;인 현장에서 팀장에게 보여지는 안내 문구입니다.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">안내 문구</label>
                        <Textarea
                            value={companyCollectionMessage}
                            onChange={(e) => setCompanyCollectionMessage(e.target.value)}
                            rows={3}
                            placeholder="예: 청소 종료 시 고객에게 금액은 대표님께 직접 연락드리면 된다고 전달"
                            className="text-sm"
                        />
                        <p className="text-xs text-slate-400">
                            비워두면 기본 문구가 표시됩니다.
                        </p>
                    </div>

                    {companyCollectionMessage && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-red-600 mb-1">📋 미리보기</p>
                            <p className="text-sm text-red-700 font-medium whitespace-pre-line leading-relaxed">
                                {companyCollectionMessage}
                            </p>
                        </div>
                    )}

                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        저장
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-blue-200">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-blue-700">🌐 홍보 페이지 (포트폴리오)</CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                                고객에게 작업 후 완료된 현장의 전/후 사진을 보여줄 수 있는 전용 웹페이지를 제공합니다.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${promotionEnabled ? 'text-blue-600' : 'text-slate-400'}`}>
                                {promotionEnabled ? '활성' : '비활성'}
                            </span>
                            <Switch
                                checked={promotionEnabled}
                                onCheckedChange={setPromotionEnabled}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {promotionEnabled ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
                            <p className="text-sm text-blue-800 font-medium">홍보 페이지 주소</p>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={`${baseUrl}/p/${companyCode}`}
                                    className="bg-white text-blue-900 font-medium text-sm"
                                />
                                <Button
                                    variant="outline"
                                    className="bg-white hover:bg-slate-50 border-blue-200 text-blue-700 whitespace-nowrap"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${baseUrl}/p/${companyCode}`)
                                        toast.success('주소가 복사되었습니다.')
                                    }}
                                >
                                    주소 복사
                                </Button>
                            </div>

                            <div className="pt-2">
                                <label className="text-sm font-medium text-blue-900 block mb-1.5">대표 연락처 (고객 문의용)</label>
                                <Input
                                    value={promotionContactNumber}
                                    onChange={(e) => setPromotionContactNumber(e.target.value)}
                                    placeholder="예: 010-1234-5678"
                                    className="border-blue-200 focus-visible:ring-blue-500"
                                />
                                <p className="text-xs text-blue-600 mt-1.5 opacity-80">
                                    등록 시 홍보 페이지에 고객이 바로 문자를 보낼 수 있는 기능이 활성화됩니다.
                                </p>
                            </div>

                            <p className="text-xs text-blue-600">
                                관리자 메뉴의 <strong>[홍보 관리]</strong>에서 노출시킬 현장을 관리할 수 있습니다.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-dashed rounded-lg p-6 text-center text-slate-500">
                            <p className="text-sm">홍보 페이지 기능이 비활성화되어 있습니다.</p>
                            <p className="text-xs mt-1">활성화하면 별도의 가입 없이 열람 가능한 고객 전용 포트폴리오 사이트가 생성됩니다.</p>
                        </div>
                    )}

                    <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        저장
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
