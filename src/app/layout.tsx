import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import PWARegister from '@/components/PWARegister'
import { AuthStateListener } from '@/components/auth-state-listener'
import Script from 'next/script'
import { headers } from 'next/headers'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nexuspartner.kr'),
  title: 'NEXUS',
  description: '청소 현장 관리 시스템',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NEXUS',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const isMaintenance = host.includes('nexus.xn--mk1bu44c')

  return (
    <html lang="ko">
      <body className={inter.className}>
        {isMaintenance ? (
          <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-indigo-500/30 selection:text-indigo-200">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.05),transparent_50%)] pointer-events-none" />
            <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              {/* Pulsing cog / tool icon container */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 shadow-lg relative flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <svg className="w-10 h-10 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-full tracking-wider uppercase mb-4">
                Under Maintenance
              </span>
              
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-4">
                서비스 점검 안내
              </h1>
              
              <p className="text-slate-400 text-sm md:text-base leading-relaxed break-keep mb-8">
                현재 서비스 안정화 및 시스템 최적화를 위한 정기 점검이 진행 중입니다. 이용에 불편을 드려 대단히 죄송하며, 더욱 신뢰할 수 있고 쾌적한 서비스를 위해 신속하게 완료하도록 하겠습니다.
              </p>
              
              <div className="w-full border-t border-slate-800/80 pt-6 space-y-3.5 text-left text-xs text-slate-400">
                <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
                  <span className="font-semibold text-slate-300">점검 대상</span>
                  <span>넥서스 파트너(NEXUS PARTNER) 전체 서비스</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
                  <span className="font-semibold text-slate-300">점검 영향</span>
                  <span>점검 기간 중 플랫폼 전체 기능 사용 불가</span>
                </div>
              </div>
              
              <div className="mt-8 text-[11px] text-slate-500">
                © NEXUS. All rights reserved.
              </div>
            </div>
          </div>
        ) : (
          <>
            <AuthStateListener />
            <PWARegister />
            {children}
            <Toaster />
            <Script 
                strategy="beforeInteractive" 
                src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services,clusterer,drawing&autoload=false`} 
            />
          </>
        )}
      </body>
    </html>
  )
}
