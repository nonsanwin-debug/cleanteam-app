'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Download } from 'lucide-react'

export function InstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isAppInstalled, setIsAppInstalled] = useState(false)
    const [showGuide, setShowGuide] = useState(false)

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)

            // Chrome으로 전환되어 왔을 때 자동 설치 프롬프트
            const params = new URLSearchParams(window.location.search)
            if (params.get('install') === 'true') {
                setTimeout(async () => {
                    e.prompt()
                    const { outcome } = await e.userChoice
                    if (outcome === 'accepted') {
                        setIsAppInstalled(true)
                    }
                    // URL에서 파라미터 제거
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

    const isInAppBrowser = () => {
        const ua = navigator.userAgent || ''
        return /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line|SamsungBrowser.*CrossApp/i.test(ua)
    }

    const isPWACapable = () => {
        const ua = navigator.userAgent || ''
        // Chrome, Samsung Internet, Edge 등 PWA 지원 브라우저
        return /Chrome|SamsungBrowser/i.test(ua)
    }

    const isIOS = () => {
        const ua = navigator.userAgent || ''
        return /iPhone|iPad|iPod/i.test(ua)
    }

    const isSafari = () => {
        const ua = navigator.userAgent || ''
        return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua)
    }

    const handleInstall = async () => {
        // 1. PWA 프롬프트가 있으면 바로 설치 (Android Chrome)
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setIsAppInstalled(true)
            }
            setDeferredPrompt(null)
            return
        }

        // 2. iOS 처리
        if (isIOS()) {
            if (isSafari()) {
                // Safari에서 접속 중 → 가이드 표시
                setShowGuide(true)
            } else {
                // iOS 인앱브라우저 → Safari로 열기
                window.location.href = window.location.href
                // iOS에서는 프로그래밍으로 Safari를 강제 실행할 수 없으므로 가이드 표시
                setShowGuide(true)
            }
            return
        }

        // 3. Android: 인앱브라우저 or 비Chrome → Chrome으로 열기
        if (isInAppBrowser() || !isPWACapable()) {
            const baseUrl = window.location.origin + window.location.pathname
            const installUrl = baseUrl + '?install=true'
            const intentUrl = `intent://${installUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
            window.location.href = intentUrl
            return
        }

        // 4. Chrome인데 프롬프트 없음 → 가이드 표시
        setShowGuide(true)
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

                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {isIOS() ? 'Safari에서 열기' : 'Chrome에서 열기'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {isIOS()
                                            ? '카카오톡 등이 아닌 Safari 브라우저에서 이 페이지를 열어주세요'
                                            : '카카오톡 등 인앱브라우저가 아닌 Chrome에서 열어주세요'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {isIOS() ? '공유 버튼 누르기' : '메뉴에서 "홈 화면에 추가"'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {isIOS()
                                            ? <>하단의 <strong>공유 (□↑)</strong> 버튼을 눌러주세요</>
                                            : <><strong>⋮</strong> 메뉴 → <strong>&quot;홈 화면에 추가&quot;</strong> 선택</>}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {isIOS() ? '"홈 화면에 추가" 선택' : '설치 완료!'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {isIOS()
                                            ? '목록에서 "홈 화면에 추가"를 눌러주세요'
                                            : '홈 화면에 NEXUS 아이콘이 생성됩니다'}
                                    </p>
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
                </div>,
                document.body
            )}
        </>
    )
}
