'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Settings, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getCompanySettings, updateCompanySettings } from '@/actions/admin'

export default function SettingsPage() {
    const [smsBankName, setSmsBankName] = useState('')
    const [smsAccountNumber, setSmsAccountNumber] = useState('')
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadSettings() {
            const settings = await getCompanySettings()
            if (settings) {
                setSmsBankName(settings.sms_bank_name || '')
                setSmsAccountNumber(settings.sms_account_number || '')
            }
            setLoading(false)
        }
        loadSettings()
    }, [])

    async function handleSave() {
        setSaving(true)
        try {
            const result = await updateCompanySettings(smsBankName, smsAccountNumber)
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
                    <CardTitle className="text-lg">📱 수금 문자 설정</CardTitle>
                    <p className="text-sm text-slate-500">
                        팀장수금 시 고객에게 보내는 문자에 포함될 계좌 정보입니다.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
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

                    <div className="bg-slate-50 border rounded-lg p-3 mt-4">
                        <p className="text-xs font-medium text-slate-600 mb-1">미리보기 (문자 내용)</p>
                        <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">
                            {`고객님 청소는 잘 마무리 되었습니다
아래 계좌번호로 명시된 금액 입금 후
예금주 성함과 함께 문자 부탁드리겠습니다

입금 계좌번호 :
${smsBankName || '(은행명)'}
${smsAccountNumber || '(계좌번호)'}
잔금 : 000,000원
추가금 : 000,000원
합계 : 000,000원

추후 부족하신 부분이나 문제가 있는 부분에 대해서
연락주시면 바로 처리 도와드리겠습니다`}
                        </p>
                    </div>

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
