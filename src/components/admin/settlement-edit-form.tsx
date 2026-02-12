'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { updateSettlementInfo } from '@/actions/sites'
import { toast } from 'sonner'
import { Loader2, Pencil, X, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SettlementEditFormProps {
    siteId: string
    collectionType: 'site' | 'company'
    balanceAmount: number
    additionalAmount: number
    additionalDescription: string
}

export function SettlementEditForm({
    siteId,
    collectionType: initialCollectionType,
    balanceAmount: initialBalanceAmount,
    additionalAmount: initialAdditionalAmount,
    additionalDescription: initialAdditionalDescription,
}: SettlementEditFormProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const [collectionType, setCollectionType] = useState(initialCollectionType)
    const [balanceAmount, setBalanceAmount] = useState(initialBalanceAmount.toString())
    const [additionalAmount, setAdditionalAmount] = useState(initialAdditionalAmount.toString())
    const [additionalDescription, setAdditionalDescription] = useState(initialAdditionalDescription)

    function handleCancel() {
        setCollectionType(initialCollectionType)
        setBalanceAmount(initialBalanceAmount.toString())
        setAdditionalAmount(initialAdditionalAmount.toString())
        setAdditionalDescription(initialAdditionalDescription)
        setIsEditing(false)
    }

    async function handleSave() {
        setIsLoading(true)
        try {
            const result = await updateSettlementInfo(siteId, {
                collection_type: collectionType,
                balance_amount: parseInt(balanceAmount || '0'),
                additional_amount: parseInt(additionalAmount || '0'),
                additional_description: additionalDescription,
            })

            if (!result.success) {
                throw new Error(result.error || '수정에 실패했습니다.')
            }

            toast.success('정산 정보가 수정되었습니다.')
            setIsEditing(false)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || '수정 중 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isEditing) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5"
            >
                <Pencil className="h-3.5 w-3.5" />
                수정
            </Button>
        )
    }

    return (
        <div className="space-y-4 pt-2 border-t mt-2">
            <div className="space-y-3">
                <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">수금 형태</Label>
                    <Select value={collectionType} onValueChange={(v: 'site' | 'company') => setCollectionType(v)}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="company">회사수금 (계좌이체 등)</SelectItem>
                            <SelectItem value="site">현장수금 (팀장 직접수납)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">잔금 (원)</Label>
                        <Input
                            type="number"
                            value={balanceAmount}
                            onChange={(e) => setBalanceAmount(e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">추가금액 (원)</Label>
                        <Input
                            type="number"
                            value={additionalAmount}
                            onChange={(e) => setAdditionalAmount(e.target.value)}
                            className="h-9"
                        />
                    </div>
                </div>

                <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">추가 금액 사유</Label>
                    <Input
                        value={additionalDescription}
                        onChange={(e) => setAdditionalDescription(e.target.value)}
                        placeholder="예: 피톤치드 추가, 오염 심함 등"
                        className="h-9"
                    />
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="gap-1"
                >
                    <X className="h-3.5 w-3.5" />
                    취소
                </Button>
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isLoading}
                    className="gap-1"
                >
                    {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Check className="h-3.5 w-3.5" />
                    )}
                    저장
                </Button>
            </div>
        </div>
    )
}
