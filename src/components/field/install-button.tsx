'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Download, ExternalLink } from 'lucide-react'

export function InstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isAppInstalled, setIsAppInstalled] = useState(false)
    const [showGuide, setShowGuide] = useState(false)

    const isRealChrome = () => {
        const ua = navigator.userAgent || ''
        return /Chrome/i.test(ua) && !/SamsungBrowser|Edge|OPR/i.test(ua)
    }

    const isIOS = () => {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
    }

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)

            // Chrome으로 전환되어 왔을 때 자동 설치
            const params = new URLSearchParams(window.location.search)
            if (params.get('install') === 'true' && isRealChrome()) {
                setTimeout(async () => {
                    e.prompt()
                    const { outcome } = await e.userChoice
                    if (outcome === 'accepted') {
                        setIsAppInstalled(true)
                    }
                    params.delete('install')
                    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
                    window.history.replaceState({}, '', newUrl)
                }, 500)
            }
        }
        window.addEventListener('beforeinstallprompt', handler)

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsAppInstalled(true)
        }

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    if (isAppInstalled) return null

    const handleInstall = async () => {
        // Chrome에서만 네이티브 프롬프트 사용
        // Samsung Internet은 Play Protect 차단 → Chrome에서만 네이티브 프롬프트
        const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent || '')
        if (deferredPrompt && !isSamsungBrowser) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setIsAppInstalled(true)
            }
            setDeferredPrompt(null)
            return
        }

        // 그 외 → 가이드 표시
        setShowGuide(true)
    }

    const copyUrlForChrome = async () => {
        const url = window.location.origin + '/field/home'
        try {
            await navigator.clipboard.writeText(url)
            alert('링크가 복사되었습니다!\nChrome을 열고 주소창에 붙여넣기 해주세요.')
        } catch {
            // clipboard API 실패 시 prompt로 fallback
            prompt('아래 주소를 복사하여 Chrome에서 열어주세요:', url)
        }
        setShowGuide(false)
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

            {showGuide && createPortal(
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

                        {isIOS() ? (
                            /* iOS Safari 가이드 */
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                    <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Safari에서 열기</p>
                                        <p className="text-xs text-slate-500 mt-0.5">카카오톡 등이 아닌 <strong>Safari</strong> 브라우저에서 이 페이지를 열어주세요</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                    <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">공유 버튼 누르기</p>
                                        <p className="text-xs text-slate-500 mt-0.5">하단의 <strong>공유 (□↑)</strong> 버튼을 눌러주세요</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                    <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">&quot;홈 화면에 추가&quot; 선택</p>
                                        <p className="text-xs text-slate-500 mt-0.5">목록에서 &quot;홈 화면에 추가&quot;를 눌러주세요</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Android 가이드 - Chrome으로 유도 */
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <ExternalLink className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Chrome 브라우저에서 열어주세요</p>
                                        <p className="text-xs text-slate-500 mt-1">카카오톡, 삼성인터넷 등에서는 앱 설치가 제한됩니다.</p>
                                        <p className="text-xs text-slate-500 mt-1">아래 버튼을 누르면 <strong>링크가 복사</strong>됩니다.<br/>Chrome을 열고 주소창에 <strong>붙여넣기</strong> 후 앱 설치를 눌러주세요.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isIOS() ? (
                            <button
                                onClick={() => setShowGuide(false)}
                                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors"
                            >
                                확인
                            </button>
                        ) : (
                            <button
                                onClick={copyUrlForChrome}
                                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                링크 복사하기
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
