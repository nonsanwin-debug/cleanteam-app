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
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadSettings() {
            const settings = await getCompanySettings()
            if (settings) {
                setSmsEnabled(settings.sms_enabled || false)
                setSmsBankName(settings.sms_bank_name || '')
                setSmsAccountNumber(settings.sms_account_number || '')
                setSmsMessageTemplate(settings.sms_message_template || DEFAULT_TEMPLATE)
            }
            setLoading(false)
        }
        loadSettings()
    }, [])

    async function handleSave() {
        setSaving(true)
        try {
            const result = await updateCompanySettings(smsEnabled, smsBankName, smsAccountNumber, smsMessageTemplate)
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
        </div>
    )
}
