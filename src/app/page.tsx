import { redirect } from 'next/navigation'

export default function Home() {
  // redirect to the new worker login page that has Kakao OAuth enabled
  redirect('/auth/login')
}
