import { redirect } from 'next/navigation'

export default function DeprecatedAdminRegisterPage() {
    redirect('/auth/admin-login')
}
