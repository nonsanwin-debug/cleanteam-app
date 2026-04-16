'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

export function InstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isAppInstalled, setIsAppInstalled] = useState(false)
    const [showGuide, setShowGuide] = useState(false)

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }
        window.addEventListener('beforeinstallprompt', handler)

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsAppInstalled(true)
        }

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    if (isAppInstalled) return null

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setIsAppInstalled(true)
            }
            setDeferredPrompt(null)
        } else {
            setShowGuide(true)
        }
    }

    return (
        <>
            <button
                onClick={handleInstall}
                className="ml-auto flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.96] text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-sm"
            >
                <Download className="w-3.5 h-3.5" />
                앱 설치
            </button>

            {showGuide && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setShowGuide(false)}>
                    <div
                        className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-10 space-y-5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center">
                            <div className="w-10 h-1 bg-slate-300 rounded-full" />
                        </div>

                        <div className="text-center space-y-2">
                            <div className="bg-teal-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto">
                                <Download className="w-7 h-7 text-teal-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">NEXUS 앱 설치하기</h3>
                            <p className="text-sm text-slate-500">홈 화면에 추가하면 앱처럼 빠르게<br />접속할 수 있습니다.</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">브라우저에서 열기</p>
                                    <p className="text-xs text-slate-500 mt-0.5">카카오톡 등 인앱브라우저가 아닌 <strong>Chrome</strong> 또는 <strong>Safari</strong>에서 열어주세요</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">메뉴에서 &quot;홈 화면에 추가&quot;</p>
                                    <p className="text-xs text-slate-500 mt-0.5"><strong>⋮</strong> 또는 <strong>공유</strong> → <strong>&quot;홈 화면에 추가&quot;</strong> 선택</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">설치 완료!</p>
                                    <p className="text-xs text-slate-500 mt-0.5">홈 화면에 NEXUS 아이콘이 생성됩니다</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowGuide(false)}
                            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
