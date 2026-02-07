import { getChecklistTemplate } from '@/actions/checklists'
import { ChecklistBuilder } from '@/components/admin/checklist-builder'
import { notFound } from 'next/navigation'

interface PageProps {
    params: {
        id: string
    }
}

export default async function ChecklistDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const template = await getChecklistTemplate(params.id)

    if (!template) {
        notFound()
    }

    return (
        <ChecklistBuilder
            templateId={template.id}
            initialItems={template.items}
            title={template.title}
        />
    )
}
