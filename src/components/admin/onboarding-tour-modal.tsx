'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
    X, 
    Building2, 
    UserPlus, 
    Users, 
    Share2, 
    Inbox, 
    ChevronLeft, 
    ChevronRight, 
    Sparkles, 
    CheckCircle2,
    Info,
    Calendar,
    Clock,
    DollarSign,
    MapPin,
    UserCheck,
    FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const CHAPTERS = [
    // 🏢 Chapter 1: 현장 관리 진입 및 추가
    {
        id: 'register_nav',
        title: '현장 관리 메뉴 진입',
        targetId: 'nav-sites',
        icon: Building2,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/dashboard',
        forceDirectClick: true,
        steps: [
            '왼쪽 메뉴에서 [현장 관리] 메뉴를 직접 누르세요.'
        ],
        tip: '현장 관리 메뉴는 달력 일정 생성, 담당자 지정 및 오더 이관 등 핵심 업무의 중심지입니다.'
    },
    {
        id: 'register_action',
        title: '새 현장 추가 시작',
        targetId: 'btn-add-site',
        icon: Building2,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        forceDirectClick: true,
        steps: [
            '우측 상단에 밝게 빛나는 [현장 추가] 버튼을 직접 클릭해 보세요.'
        ],
        tip: '수동 등록 외에도 카카오톡 오더를 복사 붙여넣기해 자동 파싱하는 텍스트 분석 기능도 지원합니다.'
    },
    
    // 🗓️ 폼 필드 하나씩 상세 가이드 지명 (17개 필드)
    {
        id: 'form_date',
        title: '작업 날짜 선택',
        targetId: 'date-picker-grid',
        icon: Calendar,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '달력 패널에서 청소 작업을 진행할 [날짜를 선택]해 주세요.',
            '원하는 일자를 터치하면 파란색 원으로 활성화됩니다.'
        ],
        tip: '달력 위의 좌우 화살표를 눌러 주차를 넘기며 편하게 날짜를 지정하실 수 있습니다.'
    },
    {
        id: 'form_ampm',
        title: '오전 / 오후 구분',
        targetId: 'time-ampm-toggle',
        icon: Clock,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '작업 일정이 [오전]인지 [오후]인지 선택해 주세요.'
        ],
        tip: '오전/오후 구분을 통해 일정을 빠르게 선별하고 요원 작업 목록에 직관적으로 시각화됩니다.'
    },
    {
        id: 'form_hour',
        title: '시작 시간 선택',
        targetId: 'time-hour-grid',
        icon: Clock,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '오더가 시작되는 [정확한 시각(시간)]을 직접 클릭하여 지정해 주세요.'
        ],
        tip: '1시부터 12시까지 정규 시각 배열이 제공되어 빠르고 편리하게 선택하실 수 있습니다.'
    },
    {
        id: 'form_minute',
        title: '분 단위 최종 지정',
        targetId: 'time-minute-selection',
        icon: Clock,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '[00분] 또는 [30분] 단위를 탭하여 오더 시작 시간을 최종 확정해 줍니다.'
        ],
        tip: '정시 또는 30분 단위 설정 방식으로 작업 편의를 높였습니다.'
    },
    {
        id: 'form_name',
        title: '현장명 기입',
        targetId: 'input-site-name',
        icon: FileText,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '[현장명] 입력 칸을 클릭하고 텍스트를 입력하세요.',
            '아파트명, 건물명 및 동/호수를 알아보기 쉽게 적어 줍니다 (예: 강남 자이 101-1004).'
        ],
        tip: '현장명은 관리자 및 요원들이 현장을 서로 소통하고 관리하는 일차 기준 명칭이 됩니다.'
    },
    {
        id: 'form_address',
        title: '상세 주소 입력',
        targetId: 'input-site-address',
        icon: MapPin,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '[주소] 입력 칸을 클릭해 상세 주소를 작성합니다.',
            '실제 요원 앱에서 길찾기 내비게이션으로 직결되므로 도로명/지번을 정확히 적으셔야 합니다.'
        ],
        tip: '주소를 정확하게 기입해야만 요원용 스마트폰 앱에서 단 한번의 탭으로 티맵/카카오내비 연동이 가능해집니다.'
    },
    {
        id: 'form_customer_name',
        title: '고객 성함 입력',
        targetId: 'input-customer-name',
        icon: UserCheck,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '[고객 성함] 란에 예약을 접수한 고객님의 실명 또는 예약자명을 입력하세요.'
        ],
        tip: '접수된 이름은 해피콜 진행 및 상담 데이터 정렬용으로 요긴하게 활용됩니다.'
    },
    {
        id: 'form_customer_phone',
        title: '고객 연락처 입력',
        targetId: 'input-customer-phone',
        icon: UserCheck,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '[고객 연락처] 란에 연락 가능한 전화번호를 하이픈을 넣어 기재합니다.'
        ],
        tip: '추후 청소 완수 후 고객님께 발송할 모바일 해피콜 링크 전송 및 비상 연락망으로 작동합니다.'
    },
    {
        id: 'form_residential_type',
        title: '주거 형태 입력',
        targetId: 'input-residential-type',
        icon: Building2,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '[주거 형태]를 클릭해 작성하세요. (아파트, 빌라, 주택, 원룸 등)'
        ],
        tip: '주거 형태에 따라 투입될 청소 장비와 요원 작업 양상이 달라지므로 명기해 주시는 것이 좋습니다.'
    },
    {
        id: 'form_area_size',
        title: '평수 입력',
        targetId: 'input-area-size',
        icon: FileText,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '청소를 진행할 공간의 [평수] 크기를 기입해 주세요. (예: 24평)'
        ],
        tip: '공간의 평수를 적어 두면 팀장들이 투입인력을 가늠하고 정산의 객관적 척도로 삼기 수월합니다.'
    },
    {
        id: 'form_structure_type',
        title: '구조 (방/욕실 개수) 입력',
        targetId: 'input-structure-type',
        icon: FileText,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '현장의 [구조] 정보를 기재합니다. (예: 방3, 화장실2, 베란다 확장 등)'
        ],
        tip: '세부 방과 화장실 구조는 팀장 배정 시 작업 난이도 조율과 도구 준비에 큰 보탬이 됩니다.'
    },
    {
        id: 'form_special_notes',
        title: '고객 요청 및 특이사항',
        targetId: 'input-special-notes',
        icon: FileText,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '[특이사항] 란에 주의해야 할 고객 요청 사항이나 사전 인지 정보를 입력해 줍니다.'
        ],
        tip: '예: "싱크대 물때 오염 심함, 베란다 페인트 벗겨짐 주의" 등을 적어두면 팀장의 모바일 앱 화면에 붉은색 알림으로 강조 노출됩니다.'
    },
    {
        id: 'form_collection_type',
        title: '수금 형태 선택',
        targetId: 'select-collection-type',
        icon: DollarSign,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '[수금 형태] 선택창을 클릭하여 방식을 지정합니다.',
            '회사수금(사무실 계좌로 이체) 또는 현장수금(현장 팀장이 청소 완료 후 직접 수납) 중 택일합니다.'
        ],
        tip: '이 정산 데이터는 추후 정산 로그에 완벽하게 집계되어 수금 잔액 누락 사고를 방지합니다.'
    },
    {
        id: 'form_balance_amount',
        title: '수납할 잔금 입력',
        targetId: 'input-balance-amount',
        icon: DollarSign,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '[잔금] 입력 란에 현장에서 요원이 최종 고객에게 수납받아야 할 나머지 잔금 액수를 기재합니다.'
        ],
        tip: '계약금을 제외하고 청소 완료 당일날 직접 수납해야 할 금액을 숫자(원 단위)로만 채워 주시면 됩니다.'
    },
    {
        id: 'form_additional_amount',
        title: '추가 금액 입력',
        targetId: 'input-additional-amount',
        icon: DollarSign,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '오염도 조율이나 특수 옵션으로 부과될 [추가 금액]이 있을 경우 이곳에 작성합니다.'
        ],
        tip: '현장에서 발생하는 추가 결제 내역을 깔끔하게 투명 통제할 수 있습니다.'
    },
    {
        id: 'form_additional_description',
        title: '추가 금액 부과 사유',
        targetId: 'input-additional-description',
        icon: FileText,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '추가 금액이 청구된 [부과 사유]를 상세 기입합니다. (예: 피톤치드 추가, 빌라 창틀 오염 심함 등)'
        ],
        tip: '고객과의 불필요한 결제 실랑이를 없애고 오더의 무결함을 보장해 줍니다.'
    },
    {
        id: 'form_leader',
        title: '담당 팀장 지정',
        targetId: 'select-worker-leader',
        icon: UserCheck,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        steps: [
            '이 현장 일정을 전담하고 통제할 [담당 팀장]을 드롭다운을 클릭하여 지정해 줍니다.'
        ],
        tip: '여기에 매칭된 담당 팀장의 스마트폰 모바일 화면에 현장 일정이 실시간 등록되어 즉시 작업에 투입 가능해집니다.'
    },
    {
        id: 'form_submit',
        title: '현장 등록 완료',
        targetId: 'btn-submit-site',
        icon: CheckCircle2,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
        expectedPath: '/admin/sites',
        forceDirectClick: true,
        steps: [
            '정보 기입이 모두 끝났습니다.',
            '하단의 [등록] 버튼을 직접 클릭하여 현장을 최종 등록하세요.'
        ],
        tip: '등록이 완료되면 새로운 현장 일정이 데이터베이스에 저장되며 입력 폼이 자동으로 닫힙니다.'
    },

    // 👤 Chapter 2: 요원 계정 생성 및 생성 화면 안내
    {
        id: 'workers_nav',
        title: '사용자 관리 메뉴 이동',
        targetId: 'nav-users',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/sites',
        forceDirectClick: true,
        steps: [
            '왼쪽 사이드바의 [사용자 관리] 메뉴를 직접 터치해 진입하세요.'
        ],
        tip: '메뉴 버튼을 직접 클릭해야만 다음 계정 추가 단계로 자연스럽게 이동할 수 있습니다.'
    },
    {
        id: 'workers_tab',
        title: '팀원 관리 탭 전환',
        targetId: 'tab-workers',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users',
        forceDirectClick: true,
        steps: [
            '[팀원 관리] 탭을 직접 클릭하여 팀원 관리 목록으로 이동하세요.'
        ],
        tip: '팀원 관리 탭에서만 새 팀원을 추가하고 요원 권한과 수수료 정산을 통제할 수 있습니다.'
    },
    {
        id: 'workers_action',
        title: '새 요원 계정 생성',
        targetId: 'btn-add-worker',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users',
        forceDirectClick: true,
        steps: [
            '우측 상단의 [새 팀원 추가] 버튼을 직접 클릭해 보세요.'
        ],
        tip: '비밀번호를 요원분께 공유해 주시면 요원이 모바일 앱을 다운로드받아 즉시 로그인할 수 있습니다.'
    },
    // 👤 새 팀원 등록 폼 작성 안내 (7개 단계)
    {
        id: 'form_worker_loginId',
        title: '요원 로그인 아이디 설정',
        targetId: 'loginId',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users/new',
        steps: [
            '로그인에 사용할 [아이디] 칸을 클릭하고 입력해 보세요.'
        ],
        tip: '아이디는 소속 지점/본사에서 요원이 고유하게 사용할 식별값입니다.'
    },
    {
        id: 'form_worker_password',
        title: '초기 비밀번호 입력',
        targetId: 'password',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users/new',
        steps: [
            '로그인에 사용될 [초기 비밀번호] 칸을 클릭하여 최소 6자 이상 입력해 줍니다.'
        ],
        tip: '지정된 비밀번호를 전달받은 요원이 모바일 앱에서 직접 로그인한 후 스스로 바꿀 수 있습니다.'
    },
    {
        id: 'form_worker_name',
        title: '팀원 실명 기입',
        targetId: 'name',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users/new',
        steps: [
            '요원의 실명 확인을 위한 [이름] 란을 클릭하여 기입해 주세요.'
        ],
        tip: '이름은 관리자 대시보드 화면 및 요원 리스트, 정산 대장에 실명으로 노출되는 기준 정보입니다.'
    },
    {
        id: 'form_worker_phone',
        title: '요원 연락처 기입',
        targetId: 'phone',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users/new',
        steps: [
            '현장 배정 알림을 수신할 요원의 [전화번호] 란을 클릭해 주세요.'
        ],
        tip: '전화번호는 하이픈(-) 기호가 자동으로 기입되므로 숫자만 바로 입력하시면 편리합니다.'
    },
    {
        id: 'form_worker_account',
        title: '정산 계좌 정보 입력',
        targetId: 'accountInfo',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users/new',
        steps: [
            '요원 수수료 및 일당 지급을 위한 [정산 계좌 정보]를 클릭하여 입력합니다. (선택)'
        ],
        tip: '예: "국민은행 123-45-67890 홍길동" 형식으로 적어두면 추후 지급 정산 업무 시 편리합니다.'
    },
    {
        id: 'form_worker_type',
        title: '요원 역할 및 권한 선택',
        targetId: 'select-worker-type',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users/new',
        steps: [
            '[역할 구분] 선택창을 직접 탭하여 권한을 지정합니다.',
            '팀장(현장 관리 및 완수 처리 권한 부여) 혹은 일반 팀원 중 하나를 알맞게 탭하세요.'
        ],
        tip: '팀장(leader) 권한이 있는 요원만 자신의 모바일 스마트폰 앱에서 청소 완료를 보고하고 정산을 청구할 수 있습니다.'
    },
    {
        id: 'form_worker_submit',
        title: '팀원 등록 최종 완료',
        targetId: 'btn-create-worker',
        icon: UserPlus,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
        expectedPath: '/admin/users/new',
        forceDirectClick: true,
        steps: [
            '모든 입력이 끝났습니다.',
            '하단의 [팀원 생성하기] 단추를 직접 클릭하여 생성을 마무리하세요.'
        ],
        tip: '등록 완료 즉시 새로운 팀원이 생성되어 데이터베이스에 기록되고 사용자 목록 화면으로 복귀합니다.'
    },

    // 🤝 Chapter 3: 팀장 및 팀원 현장 배정
    {
        id: 'assignment_nav',
        title: '현장 배정 화면 이동',
        targetId: 'nav-sites',
        icon: Users,
        color: 'bg-rose-600',
        textColor: 'text-rose-600',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-100',
        expectedPath: '/admin/users',
        forceDirectClick: true,
        steps: [
            '다시 왼쪽 사이드바의 [현장 관리] 메뉴 버튼을 직접 클릭해 주세요.'
        ],
        tip: '현장 목록으로 복귀한 뒤 드래그 앤 드롭 방식을 이용해 수월하게 팀원을 카드에 던질 수 있습니다.'
    },
    {
        id: 'assignment_action',
        title: '드래그 앤 드롭 팀원 배정',
        targetId: 'nav-sites',
        icon: Users,
        color: 'bg-rose-600',
        textColor: 'text-rose-600',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-100',
        expectedPath: '/admin/sites',
        steps: [
            '현장 관리 화면으로 정상 복귀했습니다.',
            'PC 환경: 하단의 팀원 목록 배지에서 요원을 클릭한 상태로 현장 카드 위로 [드래그 앤 드롭]해 떨어뜨립니다.',
            '모바일 환경: 하단의 요원 배지를 가볍게 터치해 선택한 후, 보낼 현장 카드를 가볍게 탭하면 지능적으로 배정 완료됩니다.'
        ],
        tip: '담당 팀장(메인)과 배정된 팀원(보조)들에게 스마트 알림톡과 실시간 푸시가 즉시 동기화되어 일정이 전송됩니다.'
    },

    // 🔗 Chapter 4: 오더 공유 (이관)
    {
        id: 'sharing',
        title: '파트너 오더 이관 공유',
        targetId: 'nav-sites',
        icon: Share2,
        color: 'bg-emerald-600',
        textColor: 'text-emerald-600',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        expectedPath: '/admin/sites',
        steps: [
            '일정이 겹치거나 직접 처리가 곤란한 현장을 제휴 파트너에게 양도하는 구조입니다.',
            '현장 카드의 우측 상단 [세 점(더보기)] 아이콘을 눌러 [오더 공유]를 클릭해 보세요.',
            '제휴 파트너사의 고유 정보(예: 클린체크#1234)를 검색해 전송하면 완벽히 위탁됩니다.'
        ],
        tip: '이관 완료 시 나의 원래 현장 카드는 "읽기 전용"으로 격리 보호되어 중복 제어 사고를 사전에 전면 차단합니다.'
    },

    // 📩 Chapter 5: 공유 오더 수행 및 수락
    {
        id: 'receiving_nav',
        title: '오더 공유 센터 진입',
        targetId: 'nav-shared-orders',
        icon: Inbox,
        color: 'bg-orange-600',
        textColor: 'text-orange-600',
        badgeBg: 'bg-orange-50 text-orange-700 border-orange-100',
        expectedPath: '/admin/sites',
        forceDirectClick: true,
        steps: [
            '왼쪽 사이드바에서 [오더 공유 센터] 메뉴 버튼을 직접 클릭하여 이동하세요.'
        ],
        tip: '메뉴 버튼을 직접 클릭해야만 오더 공유 수신함 대시보드를 확인하실 수 있습니다.'
    },
    {
        id: 'receiving_action',
        title: '공유 오더 수락 및 수행',
        targetId: 'nav-shared-orders',
        icon: Inbox,
        color: 'bg-orange-600',
        textColor: 'text-orange-600',
        badgeBg: 'bg-orange-50 text-orange-700 border-orange-100',
        expectedPath: '/admin/shared-orders',
        steps: [
            '오더 수발신 관제 센터입니다.',
            '상단의 [받은 공유 오더 (incoming)] 탭을 클릭하세요.',
            '파트너사가 올린 미배정 일감을 검토하고, [오더 수락하기] 버튼을 누르면 나의 새로운 매출 일정으로 즉시 이관 이식됩니다.'
        ],
        tip: '공유 오더 수락 시 소정의 수수료(캐쉬)가 차감되므로 설정이나 대시보드에서 항상 캐쉬를 충전해 두시는 것을 추천합니다.'
    }
]

interface OnboardingTourModalProps {
    isNewUser?: boolean
}

export function OnboardingTourModal({ isNewUser }: OnboardingTourModalProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [isMobileFallback, setIsMobileFallback] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    // Handle single-tone trigger event globally
    useEffect(() => {
        const handleTrigger = () => {
            setIsOpen(true)
            setCurrentStep(0)
            localStorage.removeItem('nexus_admin_onboarding_completed')
        }
        window.addEventListener('nexus-trigger-tour', handleTrigger)
        return () => window.removeEventListener('nexus-trigger-tour', handleTrigger)
    }, [])

    // Auto open logic on first dashboard mount only: ONLY FOR NEW USERS!
    // Set completed instantly upon first auto-open so it NEVER auto-opens again
    useEffect(() => {
        if (!isOpen && isNewUser) {
            const isCompleted = localStorage.getItem('nexus_admin_onboarding_completed')
            if (isCompleted !== 'true' && pathname === '/admin/dashboard') {
                setIsOpen(true)
                localStorage.setItem('nexus_admin_onboarding_completed', 'true')
            }
        }
    }, [pathname, isNewUser, isOpen])

    // Auto-advance step index based on path change (Active Multi-Page navigation tracking)
    useEffect(() => {
        if (!isOpen) return

        if (currentStep === 0 && pathname.startsWith('/admin/sites')) {
            setCurrentStep(1)
        } else if (currentStep === 20 && pathname.startsWith('/admin/users')) {
            setCurrentStep(21)
        } else if (currentStep === 22 && pathname.startsWith('/admin/users/new')) {
            setCurrentStep(23)
        } else if (currentStep === 30 && pathname.startsWith('/admin/sites')) {
            setCurrentStep(31)
        } else if (currentStep === 33 && pathname.startsWith('/admin/shared-orders')) {
            setCurrentStep(34)
        }
    }, [pathname, isOpen, currentStep])

    // Smoothly scroll the target element into view ONCE when the step transitions (Zero-jitter typing)
    useEffect(() => {
        if (!isOpen) return

        const targetId = CHAPTERS[currentStep].targetId
        const element = document.getElementById(targetId)
        if (element) {
            // Smoothly center the input field in viewport so user can see it perfectly
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [isOpen, currentStep])

    // Track element position in real-time
    useEffect(() => {
        if (!isOpen) return

        const updatePosition = () => {
            const targetId = CHAPTERS[currentStep].targetId
            const element = document.getElementById(targetId)
            
            if (element) {
                const rect = element.getBoundingClientRect()
                if (rect.width === 0 || rect.height === 0 || rect.left < 0 || rect.top < 0 || window.innerWidth < 768) {
                    setIsMobileFallback(true)
                    setTargetRect(null)
                } else {
                    setIsMobileFallback(false)
                    setTargetRect(rect)
                }
            } else {
                setIsMobileFallback(true)
                setTargetRect(null)
            }
        }

        updatePosition()

        const intervalId = setInterval(updatePosition, 180)
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)

        return () => {
            clearInterval(intervalId)
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [isOpen, currentStep])

    const handleClose = (dontShowAgain: boolean) => {
        if (dontShowAgain) {
            localStorage.setItem('nexus_admin_onboarding_completed', 'true')
        }
        setIsOpen(false)
    }

    const handleNext = () => {
        const nextStep = currentStep + 1
        if (nextStep < CHAPTERS.length) {
            const nextChapter = CHAPTERS[nextStep]
            
            // Programmatically navigate users if they are on a different page and clicked next
            if (nextChapter.expectedPath && !pathname.startsWith(nextChapter.expectedPath)) {
                router.push(nextChapter.expectedPath)
            }
            setCurrentStep(nextStep)
        } else {
            handleClose(true)
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            const prevStep = currentStep - 1
            const prevChapter = CHAPTERS[prevStep]
            
            // Go back in navigation if they choose previous
            if (prevChapter.expectedPath && !pathname.startsWith(prevChapter.expectedPath)) {
                router.push(prevChapter.expectedPath)
            }
            setCurrentStep(prevStep)
        }
    }

    // Global interaction listener for auto-advancing steps
    useEffect(() => {
        if (!isOpen) return

        const handleInteraction = (event: Event) => {
            const targetId = CHAPTERS[currentStep].targetId
            const element = document.getElementById(targetId)
            
            const targetElement = event.target as HTMLElement;
            if (!targetElement) return;

            const isTargetClick = element && (element === targetElement || element.contains(targetElement));
            const isSelectOptionClick = targetId.startsWith('select-') && 
                !!(targetElement.closest('[role="option"]') || targetElement.closest('.select-item') || targetElement.closest('[data-radix-collection-item]'));
            
            if (isTargetClick || isSelectOptionClick) {
                // Let the click happen, then auto advance after 350ms
                setTimeout(() => {
                    setCurrentStep(prev => {
                        if (prev === currentStep) {
                            const nextStep = prev + 1
                            if (nextStep < CHAPTERS.length) {
                                const nextChapter = CHAPTERS[nextStep]
                                if (nextChapter.expectedPath && !pathname.startsWith(nextChapter.expectedPath)) {
                                    router.push(nextChapter.expectedPath)
                                }
                                return nextStep
                            }
                        }
                        return prev
                    })
                }, 350)
            }
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                const targetId = CHAPTERS[currentStep].targetId
                const element = document.getElementById(targetId)
                if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                    // Enter inside text input -> advance to next step and prevent submission
                    event.preventDefault()
                    handleNext()
                }
            }
        }

        window.addEventListener('pointerdown', handleInteraction, true)
        window.addEventListener('mousedown', handleInteraction, true)
        window.addEventListener('click', handleInteraction, true)
        window.addEventListener('keydown', handleKeyDown, true)
        
        return () => {
            window.removeEventListener('pointerdown', handleInteraction, true)
            window.removeEventListener('mousedown', handleInteraction, true)
            window.removeEventListener('click', handleInteraction, true)
            window.removeEventListener('keydown', handleKeyDown, true)
        }
    }, [isOpen, currentStep, pathname, router])

    const currentChapter = CHAPTERS[currentStep]
    const IconComponent = currentChapter.icon

    if (!isOpen) return null

    // Compute float tooltip style matching spotlight rect (mathematically Clamped, left/right responsive)
    const getTooltipStyle = () => {
        if (isMobileFallback || !targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                position: 'fixed' as const,
                width: 'min(92vw, 360px)',
                zIndex: 51
            }
        }

        const width = 340
        const height = 370
        const margin = 16

        // 1. If highlighted element is on the left half of the screen, place tooltip to the right of it
        const spaceOnRight = window.innerWidth - targetRect.right
        if (spaceOnRight > width + margin + 10) {
            return {
                top: Math.min(
                    window.innerHeight - height - margin, 
                    Math.max(margin, targetRect.top + (targetRect.height / 2) - (height / 2))
                ),
                left: targetRect.right + 16,
                position: 'fixed' as const,
                width: `${width}px`,
                zIndex: 51
            }
        }

        // 2. If highlighted element is on the right half of the screen, place tooltip to the left of it (avoid overflow)
        const spaceOnLeft = targetRect.left
        if (spaceOnLeft > width + margin + 10) {
            return {
                top: Math.min(
                    window.innerHeight - height - margin,
                    Math.max(margin, targetRect.top + (targetRect.height / 2) - (height / 2))
                ),
                left: targetRect.left - width - 16,
                position: 'fixed' as const,
                width: `${width}px`,
                zIndex: 51
            }
        }

        // 3. Fallback: place below the target, clamping left & top to keep it fully visible inside viewport
        const idealLeft = targetRect.left + (targetRect.width / 2) - (width / 2)
        const clampedLeft = Math.max(margin, Math.min(window.innerWidth - width - margin, idealLeft))
        
        const idealTop = targetRect.bottom + 16
        const clampedTop = Math.max(margin, Math.min(window.innerHeight - height - margin, idealTop))

        return {
            top: clampedTop,
            left: clampedLeft,
            position: 'fixed' as const,
            width: `${width}px`,
            zIndex: 51
        }
    }

    const tooltipStyle = getTooltipStyle()

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden select-none pointer-events-none">
            {/* 4-Blocker Backdrop mask around the highlighted target rect */}
            {targetRect && !isMobileFallback ? (
                <>
                    {/* Top panel */}
                    <div 
                        className="fixed bg-slate-950/65 backdrop-blur-[0.5px] z-40 transition-all duration-300 pointer-events-auto"
                        style={{
                            top: 0,
                            left: 0,
                            right: 0,
                            height: Math.max(0, targetRect.top - 6),
                        }}
                    />
                    {/* Bottom panel */}
                    <div 
                        className="fixed bg-slate-950/65 backdrop-blur-[0.5px] z-40 transition-all duration-300 pointer-events-auto"
                        style={{
                            top: Math.max(0, targetRect.bottom + 6),
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                    />
                    {/* Left panel */}
                    <div 
                        className="fixed bg-slate-950/65 backdrop-blur-[0.5px] z-40 transition-all duration-300 pointer-events-auto"
                        style={{
                            top: Math.max(0, targetRect.top - 6),
                            left: 0,
                            width: Math.max(0, targetRect.left - 8),
                            height: Math.max(0, targetRect.height + 12),
                        }}
                    />
                    {/* Right panel */}
                    <div 
                        className="fixed bg-slate-950/65 backdrop-blur-[0.5px] z-40 transition-all duration-300 pointer-events-auto"
                        style={{
                            top: Math.max(0, targetRect.top - 6),
                            left: Math.max(0, targetRect.right + 8),
                            right: 0,
                            height: Math.max(0, targetRect.height + 12),
                        }}
                    />
                </>
            ) : (
                /* Fullscreen overlay when mobile fallback or no element is focused */
                <div 
                    className="absolute inset-0 bg-slate-950/65 backdrop-blur-[0.5px] z-40 transition-opacity duration-300 pointer-events-auto"
                />
            )}

            {/* Glowing Border around highlighted element with no pointer blockers */}
            {targetRect && !isMobileFallback && (
                <div 
                    className="fixed z-50 rounded-xl border-3 border-blue-500 pointer-events-none transition-all duration-300 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    style={{
                        top: targetRect.top - 6,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 12,
                    }}
                >
                    <div className="absolute -inset-1 rounded-xl border border-blue-400/50 animate-ping opacity-75 pointer-events-none" />
                </div>
            )}

            <div 
                ref={tooltipRef}
                style={tooltipStyle}
                className="onboarding-tour-modal bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col pointer-events-auto transition-all duration-300 ease-out animate-in fade-in zoom-in-95"
            >
                {/* Header Progress Indicators */}
                <div className="px-4.5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[9px] font-black tracking-tight px-2 py-0.5 rounded-full border shrink-0",
                            currentChapter.badgeBg
                        )}>
                            STEP {currentStep + 1}
                        </span>
                        <div className="flex gap-0.5">
                            <span className="text-[10px] text-slate-400 font-bold">/ {CHAPTERS.length}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleClose(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Instruction Body */}
                <div className="p-4.5 flex-1 overflow-y-auto max-h-[300px] space-y-3.5">
                    
                    {/* Chapter Title */}
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "w-8.5 h-8.5 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs",
                            currentChapter.color
                        )}>
                            <IconComponent className="w-4.5 h-4.5" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 leading-tight break-keep">{currentChapter.title}</h3>
                    </div>

                    {/* Step Guidelines */}
                    <div className="space-y-2">
                        {currentChapter.steps.map((step, idx) => (
                            <div 
                                key={idx} 
                                className="flex gap-2 items-start bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-2.5 rounded-lg transition-colors"
                            >
                                <span className={cn(
                                    "text-[8px] font-black text-white px-1.5 py-0.5 rounded-md shrink-0 mt-0.5 shadow-xs",
                                    currentChapter.color
                                )}>
                                    ✔
                                </span>
                                <p className="text-xs font-semibold text-slate-750 leading-relaxed break-keep">
                                    {step}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Mobile fallback indicator */}
                    {isMobileFallback && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 flex gap-2">
                            <span className="text-xs shrink-0">📱</span>
                            <p className="text-[9px] text-amber-900 leading-normal font-semibold break-keep">
                                모바일 화면에서는 상단 삼선(☰) 단추를 눌러 지목된 메뉴를 직접 찾아 탭해 주시기 바랍니다.
                            </p>
                        </div>
                    )}

                    {/* Tip Section */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex gap-2">
                        <Info className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", currentChapter.textColor)} />
                        <div className="space-y-0.5 min-w-0">
                            <p className={cn("text-[9px] font-bold", currentChapter.textColor)}>NEXUS 가이드 봇 🤖</p>
                            <p className="text-[9px] text-slate-655 leading-relaxed font-medium break-keep">
                                {currentChapter.tip}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-4.5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                        onClick={() => handleClose(true)}
                        className="text-[9px] font-bold text-slate-400 hover:text-slate-700 transition-colors p-1"
                    >
                        다시 보지 않기
                    </button>

                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className="h-8 px-2.5 rounded-lg border-slate-300 text-slate-700 font-bold text-xs"
                        >
                            <ChevronLeft className="w-3 h-3 mr-0.5" />
                            이전
                        </Button>
                        
                        {currentChapter.forceDirectClick ? (
                            <div className="h-8 px-3 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[10px] flex items-center justify-center animate-pulse gap-1 shadow-xs select-none">
                                <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" /> 직접 클릭 필수 👆
                            </div>
                        ) : (
                            <Button
                                onClick={handleNext}
                                className={cn(
                                    "h-8 px-3 rounded-lg text-white font-bold text-xs shadow-xs transition-colors",
                                    currentStep === CHAPTERS.length - 1 ? "bg-emerald-600 hover:bg-emerald-750" : "bg-blue-600 hover:bg-blue-755"
                                )}
                            >
                                {currentStep === CHAPTERS.length - 1 ? (
                                    <span className="flex items-center gap-1">
                                        가이드 종료 <CheckCircle2 className="w-3 h-3" />
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-0.5">
                                        다음 지시 <ChevronRight className="w-3 h-3" />
                                    </span>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
