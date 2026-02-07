import { getChecklistTemplates, createChecklistTemplate } from '@/actions/checklists'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, FileText, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ChecklistListPage() {
    const templates = await getChecklistTemplates()

    async function create(formData: FormData) {
        'use server'
        const title = formData.get('title') as string
        if (!title) return
        await createChecklistTemplate(title)
        redirect('/admin/checklists')
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">체크리스트 관리</h2>
                <p className="text-muted-foreground">
                    서비스별 청소 점검 항목 템플릿을 관리합니다.
                </p>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">새 템플릿 만들기</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={create} className="flex gap-2">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="title" className="sr-only">템플릿 제목</Label>
                            <Input id="title" name="title" placeholder="예: 입주청소 표준, 오피스 정기관리" required />
                        </div>
                        <Button type="submit">
                            <Plus className="mr-2 h-4 w-4" /> 생성
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                    <Link href={`/admin/checklists/${template.id}`} key={template.id}>
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-primary h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    {template.title}
                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                </CardTitle>
                                <CardDescription>
                                    {template.items?.length || 0}개의 점검 항목
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-slate-500">
                                    <FileText className="mr-2 h-4 w-4" />
                                    템플릿 수정하기
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
                {templates.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        등록된 템플릿이 없습니다. 위에서 새로 생성해주세요.
                    </div>
                )}
            </div>
        </div>
    )
}
