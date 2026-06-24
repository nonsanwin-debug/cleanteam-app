import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Shield, User, Clock, CheckCircle2, ChevronRight } from 'lucide-react'

export const metadata = {
    title: '개인정보 처리방침 | NEXUS',
    description: 'NEXUS시스템 서비스 이용자를 위한 개인정보 처리방침 문서입니다.',
}

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm mb-2">
                        <Shield className="w-8 h-8 animate-pulse" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                        개인정보 처리방침
                    </h1>
                    <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base">
                        NEXUS시스템(이하 &apos;회사&apos;)은 이용자의 개인정보를 소중히 다루며, 개인정보 보호법 등 관련 법령을 준수합니다.
                    </p>
                    <div className="text-xs text-slate-400 font-mono">
                        시행일자: 2026년 3월 13일
                    </div>
                </div>

                {/* Quick Navigation Card */}
                <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white/80 backdrop-blur-md">
                    <CardHeader className="bg-slate-100/50 border-b border-slate-200/40 py-4 px-6">
                        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" /> 핵심 요약사항
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg h-fit">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold text-slate-400">수집 항목</div>
                                <div className="text-sm font-medium text-slate-800 leading-snug">이름, 연락처, 계좌 정보, 현장 사진</div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg h-fit">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold text-slate-400">수집 목적</div>
                                <div className="text-sm font-medium text-slate-800 leading-snug">작업 배정/관리, 보고서 발송, 정산 정합성 검증</div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg h-fit">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold text-slate-400">보유 기간</div>
                                <div className="text-sm font-medium text-slate-800 leading-snug">회원 탈퇴 시까지 (법령 사항 제외)</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Detailed Privacy Content */}
                <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm p-6 sm:p-10 space-y-10 text-slate-700 leading-relaxed text-sm sm:text-base">
                    
                    {/* Section 1 */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-900 text-white rounded-full">1</span>
                            개인정보의 처리 목적
                        </h2>
                        <p>
                            회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-slate-600 mt-2">
                            <li><strong>서비스 회원 가입 및 관리</strong>: 회원 가입의사 확인, 본인식별·인증, 회원자격 유지·관리, 부정이용 방지</li>
                            <li><strong>청소 현장 배정 및 작업 관리</strong>: 배정 팀장 매칭, 작업 시작/종료 관리, 작업 전/중/후 상태 확인</li>
                            <li><strong>고객에 대한 완료 보고서 제공</strong>: 신청 고객에게 작업 현황 피드백 및 완료 보고서 링크 전송</li>
                            <li><strong>수금 및 정산 관리 지원</strong>: 현장별 미수금/추가금 현황 확인 및 정산금 지급 대상 계좌 정보 검증 지원</li>
                        </ul>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 2 */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-900 text-white rounded-full">2</span>
                            처리하는 개인정보의 항목
                        </h2>
                        <p>회사는 서비스 제공을 위해 아래와 같은 개인정보 항목을 수집 및 처리하고 있습니다.</p>
                        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="p-3 sm:p-4 font-semibold text-slate-600">구분</th>
                                        <th className="p-3 sm:p-4 font-semibold text-slate-600">수집 항목</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                    <tr>
                                        <td className="p-3 sm:p-4 font-medium text-slate-800">이용자 (팀장/팀원)</td>
                                        <td className="p-3 sm:p-4">이름, 휴대전화 번호, 은행명, 계좌번호, 예금주명, 비밀번호, 소속 업체명, 푸시 토큰 정보</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 sm:p-4 font-medium text-slate-800">현장 및 고객</td>
                                        <td className="p-3 sm:p-4">고객명, 고객 연락처, 청소 현장 주소, 현장 작업 전/중/후 사진, 현장 특이사항</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 sm:p-4 font-medium text-slate-800">자동 수집 항목</td>
                                        <td className="p-3 sm:p-4">접속 IP 정보, 서비스 이용 기록, 기기 정보(OS 버전, 모델명)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 3 */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-900 text-white rounded-full">3</span>
                            개인정보의 처리 및 보유 기간
                        </h2>
                        <p>
                            회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-slate-600 mt-2">
                            <li><strong>회원 정보</strong>: 서비스 탈퇴 시까지 보유 및 이용합니다. 단, 부정 이용 방지를 위해 탈퇴 후 30일간 보관 후 파기합니다.</li>
                            <li><strong>현장 정보 및 정산 기록</strong>: 상법, 국세기본법 등 관계 법령에 따라 거래 내역 및 증빙 서류 보관을 위하여 관련 정보를 <strong>5년간</strong> 보유합니다.</li>
                        </ul>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 4 */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-900 text-white rounded-full">4</span>
                            개인정보의 제3자 제공에 관한 사항
                        </h2>
                        <p>
                            회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
                        </p>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 5 */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-900 text-white rounded-full">5</span>
                            개인정보처리의 위탁에 관한 사항
                        </h2>
                        <p>회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
                        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="p-3 sm:p-4 font-semibold text-slate-600">수탁업체</th>
                                        <th className="p-3 sm:p-4 font-semibold text-slate-600">위탁 업무 내용</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                    <tr>
                                        <td className="p-3 sm:p-4 font-medium text-slate-800">(주)알리고 (Aligo)</td>
                                        <td className="p-3 sm:p-4">알림톡 및 대체 SMS/LMS 발송 서비스 제공</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 sm:p-4 font-medium text-slate-800">Supabase, Inc.</td>
                                        <td className="p-3 sm:p-4">서비스 데이터 보관을 위한 클라우드 인프라 제공</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 6 */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-900 text-white rounded-full">6</span>
                            정보주체의 권리·의무 및 행사방법
                        </h2>
                        <p>
                            정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다. 권리 행사는 서면, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
                        </p>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 7 */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-900 text-white rounded-full">7</span>
                            개인정보의 파기절차 및 파기방법
                        </h2>
                        <p>
                            회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 파기하며, 종이 문서에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
                        </p>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 8 */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-900 text-white rounded-full">8</span>
                            개인정보의 안전성 확보 조치
                        </h2>
                        <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-slate-600 mt-2">
                            <li><strong>기술적 조치</strong>: 개인정보처리시스템의 비밀번호 암호화, 전송 시 보안 프로토콜(HTTPS) 적용, 해킹 등에 대비한 기술적 대책 수립</li>
                            <li><strong>관리적 조치</strong>: 개인정보 취급 직원의 최소화 및 정기 교육 실시</li>
                        </ul>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Section 9 */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-slate-900 text-white rounded-full">9</span>
                            개인정보 보호책임자
                        </h2>
                        <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 관련 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-2 text-sm">
                            <div className="flex gap-2">
                                <span className="font-semibold text-slate-800 w-24">보호책임자:</span>
                                <span className="text-slate-600">NEXUS 개인정보 담당 부서</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold text-slate-800 w-24">이메일:</span>
                                <span className="text-slate-600">contact@nexuspartner.kr</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold text-slate-800 w-24">대표번호:</span>
                                <span className="text-slate-600">1544-0000 (NEXUS 고객센터)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="flex justify-between items-center text-xs sm:text-sm text-slate-400 px-4">
                    <span>© NEXUS Partner. All rights reserved.</span>
                    <Link href="/auth/login" className="hover:text-slate-600 inline-flex items-center gap-1 font-medium transition-colors">
                        로그인 화면으로 가기 <ChevronRight className="w-3 sm:w-4 h-3 sm:h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
