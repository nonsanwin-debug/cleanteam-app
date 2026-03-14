import { redirect } from 'next/navigation'

export default function DeprecatedRegisterPage() {
    redirect('/auth/login')
}
