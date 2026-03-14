'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TermsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TermsDialog({ open, onOpenChange }: TermsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>NEXUS 서비스 이용약관</DialogTitle>
          <DialogDescription>
            입주/이사 청소 현장 관리 플랫폼 서비스 이용을 위한 약관입니다.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-6 text-sm text-slate-700 leading-relaxed pr-6">
            <h3 className="font-bold text-lg text-slate-900">제 1 장 총칙</h3>
            
            <section className="space-y-3">
              <h4 className="font-bold">제 1 조 (목 적)</h4>
              <p>이 약관은 이용자가 NEXUS(이하 “회사”)가 운영하는 인터넷 서비스 사이트 및 모바일 어플리케이션(이하 “NEXUS”)을 통해 제공하는 현장 관리 지원 서비스 및 광고 서비스(이하 “서비스”)와 관련하여 회사와 이용자의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.</p>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold">제 2 조 (정 의)</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>NEXUS:</strong> 회사가 운영하는 입주/이사 청소 현장 관리 플랫폼을 말합니다.</li>
                <li><strong>이용자:</strong> NEXUS에 접속하여 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                <li><strong>회원:</strong> 회사에 개인정보를 제공하여 회원등록을 한 자로서, 성격에 따라 다음과 같이 구분됩니다.
                  <ul className="list-circle pl-5 mt-2 space-y-1 text-slate-600">
                    <li><strong className="text-slate-700">업체 회원:</strong> 청소 서비스를 운영하며 현장 팀장에게 업무를 배정하고 관리하는 주체입니다.</li>
                    <li><strong className="text-slate-700">팀장 회원:</strong> 업체 회원으로부터 업무를 배정받아 실제 청소 현장을 관리하고 수행하는 주체입니다.</li>
                  </ul>
                </li>
                <li><strong>관리포인트:</strong> 업체 회원이 팀장 회원에게 지급해야 할 정산 예정 금액을 플랫폼 내에서 가시화하여 기록하기 위한 단순 수치 데이터를 말합니다.</li>
                <li><strong>배너 광고:</strong> 회사가 NEXUS 내 특정 영역에 업체 또는 제3자의 광고를 게재하는 서비스를 말합니다.</li>
              </ul>
            </section>

            <h3 className="font-bold text-lg text-slate-900 mt-8">제 2 장 서비스 이용 및 관리포인트</h3>
            
            <section className="space-y-3">
              <h4 className="font-bold">제 3 조 (서비스의 내용)</h4>
              <p>회사가 제공하는 서비스는 다음과 같습니다.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>입주/이사 청소 현장 배정 및 상태 관리 지원</li>
                <li>업체와 팀장 간의 업무 정산 내역 기록 관리(관리포인트 시스템)</li>
                <li>업체 및 제3자를 위한 배너 광고 게재</li>
                <li>기타 현장 관리에 부수적인 지원 서비스</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold">제 4 조 (관리포인트의 성격 및 운영)</h4>
              <ul className="list-decimal pl-5 space-y-2">
                <li>관리포인트는 플랫폼 내에서 결제 수단으로 사용할 수 있는 전자화폐나 사이버머니가 아니며, 실제 현금 가치가 없습니다.</li>
                <li>본 포인트는 업체 회원이 팀장 회원에게 지급해야 할 보수를 플랫폼 시스템 상에서 편리하게 기록 및 관리하기 위한 용도로만 사용됩니다.</li>
                <li>실제 대금의 지급 주체는 업체 회원이며, 지급 방법 또한 플랫폼을 통하지 않고 업체 회원이 팀장 회원에게 직접 지급(계좌이체 등)합니다.</li>
                <li>회사는 관리포인트의 기록 편의만을 제공할 뿐, 업체 회원을 대신하여 대금을 지급하거나 지급을 보증하지 않습니다.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold">제 5 조 (광고 서비스의 이용)</h4>
              <ul className="list-decimal pl-5 space-y-2">
                <li>회사는 NEXUS 내에 배너 광고를 게재할 수 있습니다.</li>
                <li>광고주와 회원 간에 광고 내용을 신뢰하여 발생한 거래 및 분쟁에 대해서 회사는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</li>
              </ul>
            </section>

            <h3 className="font-bold text-lg text-slate-900 mt-8">제 3 장 당사자의 의무 및 면책</h3>

            <section className="space-y-3">
              <h4 className="font-bold">제 6 조 (회사의 면책)</h4>
              <ul className="list-decimal pl-5 space-y-2">
                <li>회사는 업체 회원과 팀장 회원 간의 대금 정산 및 지급 과정에 일절 관여하지 않습니다. 관리포인트 기록과 실제 지급 금액의 상충, 지급 지연, 미지급 등 업체와 팀장 간에 발생하는 모든 금전적 분쟁은 당사자 간의 해결을 원칙으로 하며 회사는 이에 책임을 지지 않습니다.</li>
                <li>회사는 천재지변, 서비스 점검 등 불가항력적인 사유로 인한 서비스 중단에 대해 책임을 면합니다.</li>
                <li>회사는 회원이 게재한 정보(현장 사진, 업무 피드백 등)의 신뢰도나 정확성에 대해 보증하지 않습니다.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold">제 7 조 (회원의 의무)</h4>
              <ul className="list-decimal pl-5 space-y-2">
                <li>업체 회원은 팀장 회원과의 계약에 의거하여 실제 대금을 성실히 지급해야 하며, 플랫폼 내 관리포인트를 실제 정산 내역과 일치하도록 관리해야 할 책임이 있습니다.</li>
                <li>회원은 본 서비스의 목적(현장 관리) 외의 용도로 플랫폼을 악용해서는 안 됩니다.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold">제 8 조 (정산 정보의 등록 및 관리)</h4>
              <ul className="list-decimal pl-5 space-y-2">
                <li>회원은 업체와 팀장 간의 원활한 보수 정산을 위해 본인의 계좌번호, 은행명, 예금주 정보를 정확히 등록해야 합니다.</li>
                <li>회원은 계좌 정보가 변경될 경우 즉시 플랫폼 내에서 수정해야 하며, 정보 수정을 게을리하여 발생한 정산 오류 및 불이익에 대해 회사는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</li>
                <li>회사가 플랫폼 내에 표시하는 계좌 정보는 업체 회원이 팀장 회원에게 직접 보수를 지급할 때 참고하는 용도이며, 실제 송금 실행 및 송금 결과에 대한 모든 법적 책임은 지급 주체인 업체 회원에게 있습니다.</li>
              </ul>
            </section>

            <h3 className="font-bold text-lg text-slate-900 mt-8 mb-4">[개인정보 처리방침]</h3>

            <section className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-800">[수집하는 개인정보 항목]</h4>
                <p className="mt-1">필수 항목: 은행명, 계좌번호, 예금주 명</p>
              </div>
              
              <div>
                <h4 className="font-bold text-slate-800">[개인정보의 수집 및 이용 목적]</h4>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>업체 회원과 팀장 회원 간의 서비스 이용 대금 정산 편의 제공</li>
                  <li>서비스 이용에 따른 본인 확인 및 부정 이용 방지</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800">[개인정보의 보유 및 이용 기간]</h4>
                <p className="mt-1">회원 탈퇴 시까지 (단, 관련 법령에 따라 보존할 필요가 있는 경우 해당 기간까지 보관)</p>
              </div>
            </section>

            <div className="pt-6 border-t border-slate-200 text-slate-500 text-sm">
              <h4 className="font-bold mb-2">부칙</h4>
              <p>제 1 조 (시행일) 본 약관은 2026년 4월 10일부터 시행합니다.</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
