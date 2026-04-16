import Link from 'next/link'

export default function CustomerBookCompletePage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-sm w-full text-center space-y-4">
                <div className="text-5xl">🎉</div>
                <h1 className="text-xl font-bold text-slate-800">예약 접수 완료!</h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                    예약이 성공적으로 접수되었습니다.<br/>
                    담당자 배정 후 연락드리겠습니다.
                </p>
                <Link 
                    href="/"
                    className="block w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center justify-center transition-colors"
                >
                    홈으로 돌아가기
                </Link>
            </div>
        </div>
    )
}
