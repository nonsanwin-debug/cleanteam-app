import { CreateWorkerForm } from '@/components/admin/create-worker-form'

export const metadata = {
    title: '새 팀원 등록 | Clean Admin',
    description: '새로운 팀장 및 팀원을 등록합니다.',
}

export default function CreateWorkerPage() {
    return (
        <div className="container py-8">
            <CreateWorkerForm />
        </div>
    )
}
