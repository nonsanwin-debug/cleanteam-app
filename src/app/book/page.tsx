import { CustomerBookClient } from './book-client'

export const metadata = {
  title: {
    absolute: '프리미엄 청소 서비스 예약',
  },
  description: '프리미엄 청소 서비스를 간편하게 예약하세요.',
}

export default function BookPage() {
    return <CustomerBookClient />
}
