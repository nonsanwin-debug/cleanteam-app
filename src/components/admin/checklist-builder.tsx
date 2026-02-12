/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { CheckItem, updateChecklistTemplate, deleteChecklistTemplate } from '@/actions/checklists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, GripVertical, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

interface ChecklistBuilderProps {
    templateId: string
    initialItems: CheckItem[]
    title: string
}

export function ChecklistBuilder({ templateId, initialItems, title }: ChecklistBuilderProps) {
    const [items, setItems] = useState<CheckItem[]>(initialItems || [])
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    function addItem() {
        setItems([
            ...items,
            { id: uuidv4(), text: '', required: true }
        ])
    }

    function updateItem(id: string, field: keyof CheckItem, value: any) {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ))
    }

    function removeItem(id: string) {
        setItems(items.filter(item => item.id !== id))
    }

    async function handleSave() {
        // Validate
        if (items.some(item => !item.text.trim())) {
            toast.error('내용이 비어있는 항목이 있습니다.')
            return
        }

        setIsSaving(true)
        try {
            await updateChecklistTemplate(templateId, items)
            toast.success('저장되었습니다.')
        } catch (error) {
            toast.error('저장 실패')
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete() {
        if (!confirm('정말로 이 템플릿을 삭제하시겠습니까?')) return

        setIsDeleting(true)
        try {
            await deleteChecklistTemplate(templateId)
            toast.success('제거되었습니다.')
            router.push('/admin/checklists')
        } catch (error) {
            toast.error('삭제 실패')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
                        <p className="text-sm text-muted-foreground">총 {items.length}개 항목</p>
                    </div>
                </div>
                <div className="flex gap-2 ml-auto">
                    <Button variant="outline" size="icon" onClick={handleDelete} disabled={isDeleting} className="text-red-500 border-red-200 hover:bg-red-50">
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} size="sm">
                        {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                        저장
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {items.map((item, index) => (
                    <Card key={item.id} className="relative group">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="cursor-move text-slate-400 hover:text-slate-600 mt-1 hidden sm:block">
                                    <GripVertical className="h-5 w-5" />
                                </div>

                                <div className="flex-1 space-y-2 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <Input
                                        value={item.text}
                                        onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                                        placeholder="점검 항목 내용을 입력하세요"
                                    />
                                </div>

                                <div className="flex items-center gap-2 sm:gap-4 sm:border-l sm:pl-4 shrink-0 mt-6">
                                    <div className="flex items-center space-x-1.5">
                                        <Switch
                                            id={`req-${item.id}`}
                                            checked={item.required}
                                            onCheckedChange={(checked) => updateItem(item.id, 'required', checked)}
                                        />
                                        <Label htmlFor={`req-${item.id}`} className="text-xs cursor-pointer">
                                            필수
                                        </Label>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-slate-400 hover:text-red-500 h-8 w-8"
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Button variant="outline" className="w-full border-dashed py-8 text-slate-500 hover:bg-slate-50" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" /> 항목 추가하기
                </Button>
            </div>
        </div>
    )
}
