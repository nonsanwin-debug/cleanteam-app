'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSharedOrder } from '@/actions/shared-orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Loader2, MapPin, Calendar, Camera, X } from 'lucide-react'
import DaumPostcode from 'react-daum-postcode'
import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

const CLEANING_TYPES = ['입주청소', '이사청소', '거주청소', '사이청소', '상가청소', '특수청소']
const TIME_PREFS = ['오전 청소 요망', '오후 청소 요망', '시간 협의']
const STRUCTURE_TYPES = ['아파트', '빌라', '주택', '오피스텔', '상가', '원룸', '투룸']

export function FieldBookClient({ partnerName, partnerPhone }: { partnerName: string, partnerPhone: string }) {
    const router = useRouter()
    
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const supabase = createClient()

    // Form State
    const [address, setAddress] = useState('')
    const [detailAddress, setDetailAddress] = useState('')
    const [areaSize, setAreaSize] = useState('')
    const [isPostcodeOpen, setIsPostcodeOpen] = useState(false)
    
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [useMyInfo, setUseMyInfo] = useState(false)
    const [rewardType, setRewardType] = useState<'points' | 'discount'>('points')
    
    const [workDate, setWorkDate] = useState('')
    const [timePreference, setTimePreference] = useState('')
    const [cleanType, setCleanType] = useState('')
    const [residentialType, setResidentialType] = useState('')
    const [structureType, setStructureType] = useState('')
    const [buildingCondition, setBuildingCondition] = useState('신축')
    
    const [notes, setNotes] = useState('공동 현관 비밀번호 : \n세대 비밀번호 : \n전달 사항 : ')
    const [isAutoAssign, setIsAutoAssign] = useState(false)
    
    const [noPhotos, setNoPhotos] = useState(false)
    const [images, setImages] = useState<File[]>([])
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
    const [errorField, setErrorField] = useState<string | null>(null)

    const handleValidationError = (fieldId: string, message: string) => {
        toast.error(message)
        const applyScroll = () => {
            const el = document.getElementById(`field-${fieldId}`)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setErrorField(fieldId)
                setTimeout(() => setErrorField(null), 1500)
            }
        }
        if (step !== 1) {
            setStep(1)
            setTimeout(applyScroll, 100)
        } else {
            applyScroll()
        }
    }

    const getPricePerPyeong = (type: string) => {
        if (type === '입주청소' || type === '이사청소') return 12000
        if (type === '거주청소') return 13000
        if (type === '사이청소') return 15000
        return 12000
    }
    const isNegotiatedType = (type: string) => type === '상가청소' || type === '특수청소'

    // Handlers
    const handleCompletePostcode = (data: any) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
            if (data.bname !== '') extraAddress += data.bname;
            if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
        }

        setAddress(fullAddress);
        setIsPostcodeOpen(false);
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            if (images.length + newFiles.length > 3) {
                toast.error('사진은 최대 3장까지만 첨부할 수 있습니다.')
                return
            }
            
            setImages([...images, ...newFiles])
            
            // Generate previews
            const newPreviews = newFiles.map(file => URL.createObjectURL(file))
            setImagePreviewUrls([...imagePreviewUrls, ...newPreviews])
        }
    }

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
        
        // Revoke URL to prevent memory leak
        URL.revokeObjectURL(imagePreviewUrls[index])
        setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index))
    }

    const uploadImages = async (): Promise<string[]> => {
        const uploadedUrls: string[] = []
        
        for (const file of images) {
            const fileExt = file.name.split('.').pop()
            const fileName = `partner_order_${uuidv4()}.${fileExt}`
            const filePath = `shared_orders/${fileName}`
            
            const { error: uploadError } = await supabase.storage
                .from('site-photos')
                .upload(filePath, file)
                
            if (uploadError) {
                console.error('Upload Error:', uploadError)
                throw new Error('사진 업로드에 실패했습니다.')
            }
            
            const { data } = supabase.storage.from('site-photos').getPublicUrl(filePath)
            uploadedUrls.push(data.publicUrl)
        }
        
        return uploadedUrls
    }

    const handleSubmit = async () => {
        // Validate
        if (!cleanType) return handleValidationError('cleanType', '청소 종류를 먼저 선택해주세요.')
        if (!residentialType) return handleValidationError('residentialType', '주거 형태를 먼저 선택해주세요.')
        if (!address.trim()) return handleValidationError('address', '기본 주소를 입력해주세요.')
        if (!workDate) return handleValidationError('workDate', '청소 날짜를 지정해주세요.')
        if (!timePreference) return handleValidationError('timePreference', '희망 청소 시간을 선택해주세요.')
        if (!areaSize) return handleValidationError('areaSize', '평수를 입력해주세요.')
        if (!customerName || !customerPhone) return handleValidationError('customerInfo', '고객 정보를 입력해주세요.')

        setIsSubmitting(true)
        
        try {
            // 1. Upload Images
            let imageUrls: string[] = []
            if (images.length > 0) {
                imageUrls = await uploadImages()
            }

            // 2. Format region/notes
            // Admin format: "서울 강남구 30평 30만원" etc.
            let priceString = ''
            if (isNegotiatedType(cleanType)) {
                priceString = '협의'
            } else {
                const parsedArea = parseInt(areaSize, 10) || 0
                const pricePerPyeong = getPricePerPyeong(cleanType)
                const conditionAddPerPyeong = buildingCondition === '구축' ? 2000 : (buildingCondition === '인테리어' ? 3000 : 0)
                let calculatedPrice = parsedArea * (pricePerPyeong + conditionAddPerPyeong)
                if (rewardType === 'discount') {
                    calculatedPrice = calculatedPrice * 0.9
                }
                
                priceString = `${calculatedPrice.toLocaleString()}원`
            }

            const shortRegion = address.split(' ').slice(0, 2).join(' ') + ` ${areaSize}평 ${priceString}`
            // fullAddress is no longer sent unified. It is split for UI purposes.
            const finalNotes = `
[요청타입] ${cleanType}
[건물상태] ${buildingCondition}
[희망시간] ${timePreference}
[자동배정] ${isAutoAssign ? '넥서스 AI' : '직접선택'}
[상세 요청내용]
${notes}
            `.trim()

            const res = await createSharedOrder({
                region: shortRegion,
                address: address,
                detail_address: detailAddress,
                area_size: `${areaSize}평`,
                work_date: workDate,
                notes: finalNotes,
                image_urls: imageUrls,
                customer_phone: customerPhone,
                customer_name: customerName,
                is_auto_assign: isAutoAssign,
                residential_type: residentialType,
                structure_type: structureType || '',
                reward_type: rewardType,
                total_price: calculatedPrice
            })

            if (res.success) {
                toast.success('청소 예약이 접수되었습니다.', { description: '어드민 오더 센터로 전송되었습니다.' })
                router.push('/field/home')
                router.refresh()
            } else {
                throw new Error(res.error)
            }
        } catch (error: any) {
            toast.error(error.message || '예약 접수 중 오류가 발생했습니다.')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col min-h-screen pb-20 bg-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between">
                <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 -ml-2 text-slate-600">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="font-bold text-slate-800 flex items-center gap-2">
                    신규 예약 (2단계 중 {step}단계)
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-5 overflow-y-auto">
                {/* 1. Address & Basic Info */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="mb-2">
                            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <MapPin className="w-6 h-6 text-teal-600" /> 어디로 갈까요?
                            </h2>
                            <p className="text-sm text-slate-500">주소와 평수 정보만 간단히 적어주세요.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-4">
                                <div id="field-workDate" className={`space-y-2 transition-all duration-300 ${errorField === 'workDate' ? 'animate-bounce ring-2 ring-rose-400 p-3 rounded-xl bg-rose-50/50' : ''}`}>
                                    <Label className="text-slate-700">요청 날짜 *</Label>
                                    <Input 
                                        type="date"
                                        className="h-14 text-lg bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl" 
                                        value={workDate}
                                        onChange={e => setWorkDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]} // 오늘부터 선택 가능
                                    />
                                </div>
                                <div id="field-timePreference" className={`space-y-2 transition-all duration-300 ${errorField === 'timePreference' ? 'animate-bounce ring-2 ring-rose-400 p-3 rounded-xl bg-rose-50/50' : ''}`}>
                                    <Label className="text-slate-700">희망 시간 *</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {TIME_PREFS.map(pref => (
                                            <button
                                                key={pref}
                                                onClick={() => setTimePreference(pref)}
                                                className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                                                    timePreference === pref 
                                                    ? 'bg-teal-50 border-teal-600 text-teal-700 ring-1 ring-teal-600' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {pref === '시간 협의' ? '시간 협의' : pref.replace(' 청소 요망', '')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div id="field-address" className={`space-y-2 transition-all duration-300 ${errorField === 'address' ? 'animate-bounce ring-2 ring-rose-400 p-3 rounded-xl bg-rose-50/50' : ''}`}>
                                <Label className="text-slate-700">기본 주소 (동/호수 제외) *</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        className="flex-1 h-12 text-base bg-slate-50 border-transparent focus:ring-0 focus:border-transparent rounded-xl cursor-pointer" 
                                        placeholder="주소 검색을 눌러주세요"
                                        value={address}
                                        readOnly
                                        onClick={() => setIsPostcodeOpen(true)}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setIsPostcodeOpen(true)} 
                                        className="h-12 px-5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold whitespace-nowrap transition-colors"
                                    >
                                        주소 검색
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700">상세 주소 (아파트/동/호수)</Label>
                                <Input 
                                    className="h-12 text-base bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl" 
                                    placeholder="예: 엘스아파트 101동 202호"
                                    value={detailAddress}
                                    onChange={e => setDetailAddress(e.target.value)}
                                />
                            </div>
                            
                            <div className="space-y-4">
                                <div id="field-cleanType" className={`space-y-2 transition-all duration-300 ${errorField === 'cleanType' ? 'animate-bounce ring-2 ring-rose-400 p-3 rounded-xl bg-rose-50/50' : ''}`}>
                                    <Label className="text-slate-700">청소 종류 *</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {CLEANING_TYPES.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setCleanType(type)}
                                                className={`h-12 rounded-xl border text-sm font-medium transition-all ${
                                                    cleanType === type 
                                                    ? 'bg-teal-50 border-teal-600 text-teal-700 ring-1 ring-teal-600' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div id="field-residentialType" className={`space-y-2 pb-2 transition-all duration-300 ${errorField === 'residentialType' ? 'animate-bounce ring-2 ring-rose-400 p-3 rounded-xl bg-rose-50/50' : ''}`}>
                                    <Label className="text-slate-700">주거 형태 *</Label>
                                    <div className="relative">
                                        <select 
                                            className="h-12 w-full text-base bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl px-4 outline-none appearance-none cursor-pointer text-slate-700 font-medium transition-colors hover:bg-slate-100"
                                            value={residentialType}
                                            onChange={e => setResidentialType(e.target.value)}
                                        >
                                            <option value="" disabled hidden>아파트, 빌라 등 선택</option>
                                            {STRUCTURE_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700">건물 상태 *</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['신축', '구축', '인테리어'].map(condition => (
                                            <button
                                                key={condition}
                                                onClick={() => setBuildingCondition(condition)}
                                                className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                                                    buildingCondition === condition 
                                                    ? 'bg-teal-50 border-teal-600 text-teal-700 ring-1 ring-teal-600' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {condition}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-700">구조 (선택)</Label>
                                    <Input 
                                        className="h-12 text-base bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl" 
                                        placeholder="예: 방3 화2 베1"
                                        value={structureType}
                                        onChange={e => setStructureType(e.target.value)}
                                    />
                                </div>

                                <div id="field-areaSize" className={`space-y-2 transition-all duration-300 ${errorField === 'areaSize' ? 'animate-bounce ring-2 ring-rose-400 p-3 rounded-xl bg-rose-50/50' : ''}`}>
                                    <Label className="text-slate-700">평수 (공급면적) *</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number"
                                            className="h-12 text-base bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl pr-10" 
                                            placeholder={cleanType ? "32" : "유형 선택 시 입력가능"}
                                            value={areaSize}
                                            onChange={e => {
                                                if (!cleanType) {
                                                    toast.error('청소 유형을 먼저 선택해주세요.')
                                                    return
                                                }
                                                setAreaSize(e.target.value)
                                            }}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">평</span>
                                    </div>
                                    {areaSize && parseInt(areaSize) > 0 && cleanType && (
                                        isNegotiatedType(cleanType) ? (
                                            <p className="text-sm font-semibold text-teal-600 ml-1">
                                                예상 결제금액: 매칭 된 업체와 협의
                                            </p>
                                        ) : (
                                            (() => {
                                                const parsedArea = parseInt(areaSize);
                                                const basePricePerPyeong = getPricePerPyeong(cleanType);
                                                const conditionAddPerPyeong = buildingCondition === '구축' ? 2000 : (buildingCondition === '인테리어' ? 3000 : 0);
                                                
                                                const baseTotal = parsedArea * basePricePerPyeong;
                                                const conditionTotal = parsedArea * conditionAddPerPyeong;
                                                let finalTotal = Math.max(150000, baseTotal + conditionTotal);
                                                
                                                const isDiscount = rewardType === 'discount';
                                                const discountAmount = isDiscount ? finalTotal * 0.1 : 0;
                                                const totalAfterDiscount = finalTotal - discountAmount;

                                                return (
                                                    <div className="mt-3 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                                                        <div className="flex justify-between text-sm text-slate-600">
                                                            <span>기본 단가 ({parsedArea}평 × {basePricePerPyeong.toLocaleString()}원)</span>
                                                            <span>{baseTotal.toLocaleString()}원</span>
                                                        </div>
                                                        {conditionAddPerPyeong > 0 && (
                                                            <div className="flex justify-between text-sm text-slate-600">
                                                                <span>{buildingCondition} 할증 (+{conditionAddPerPyeong.toLocaleString()}원/평)</span>
                                                                <span>+{conditionTotal.toLocaleString()}원</span>
                                                            </div>
                                                        )}
                                                        {finalTotal === 150000 && (baseTotal + conditionTotal) < 150000 && (
                                                            <div className="flex justify-between text-sm text-slate-600">
                                                                <span>최소 정책금액 보정</span>
                                                                <span>+{(150000 - (baseTotal + conditionTotal)).toLocaleString()}원</span>
                                                            </div>
                                                        )}
                                                        {isDiscount && (
                                                            <div className="flex justify-between text-sm font-semibold text-rose-500 bg-rose-50 -mx-4 px-4 py-1.5 mt-2">
                                                                <span>10% 즉시 할인 적용</span>
                                                                <span>-{discountAmount.toLocaleString()}원</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-center text-base font-bold text-teal-700 pt-2 border-t border-slate-200 mt-2">
                                                            <span>최종 결제금액 <span className="text-xs font-normal text-teal-600/80 tracking-tight ml-1">(부가세 별도)</span></span>
                                                            <span className="text-lg">{totalAfterDiscount.toLocaleString()}원</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        )
                                    )}
                                </div>

                                <div className="pt-2 pb-1 border-t border-slate-100">
                                    <h3 className="text-slate-800 font-semibold mb-3">고객 정보</h3>
                                    <div id="field-customerInfo" className={`grid grid-cols-2 gap-3 mb-3 transition-all duration-300 ${errorField === 'customerInfo' ? 'animate-bounce ring-2 ring-rose-400 p-3 rounded-xl bg-rose-50/50' : ''}`}>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700">고객명 *</Label>
                                            <Input 
                                                className="h-12 text-base bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl" 
                                                placeholder="홍길동"
                                                value={customerName}
                                                onChange={e => setCustomerName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700">고객 연락처 *</Label>
                                            <Input 
                                                className="h-12 text-base bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl" 
                                                placeholder="010-1234-5678"
                                                value={customerPhone}
                                                onChange={e => setCustomerPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer w-max pl-1">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                            checked={useMyInfo}
                                            onChange={(e) => {
                                                const checked = e.target.checked
                                                setUseMyInfo(checked)
                                                if (checked) {
                                                    setCustomerName(partnerName)
                                                    setCustomerPhone(partnerPhone)
                                                } else {
                                                    setCustomerName('')
                                                    setCustomerPhone('')
                                                }
                                            }}
                                        />
                                        등록자(나의) 정보로 자동 채우기
                                    </label>
                                    
                                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                                        <Label className="text-slate-800 font-bold mb-1 block">✨ 파트너 리워드 혜택 선택</Label>
                                        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${rewardType === 'points' ? 'bg-teal-50 border-teal-500' : 'bg-white border-slate-200'}`}>
                                            <input 
                                                type="radio" 
                                                name="reward-type"
                                                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                                                checked={rewardType === 'points'}
                                                onChange={() => setRewardType('points')}
                                            />
                                            <span className={`text-sm font-medium ${rewardType === 'points' ? 'text-teal-800' : 'text-slate-600'}`}>
                                                현장 완료 후 10% 포인트 적립
                                            </span>
                                        </label>
                                        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${rewardType === 'discount' ? 'bg-rose-50 border-rose-400' : 'bg-white border-slate-200'}`}>
                                            <input 
                                                type="radio" 
                                                name="reward-type"
                                                className="w-4 h-4 text-rose-500 focus:ring-rose-400"
                                                checked={rewardType === 'discount'}
                                                onChange={() => setRewardType('discount')}
                                            />
                                            <span className={`text-sm font-medium ${rewardType === 'discount' ? 'text-rose-700' : 'text-slate-600'}`}>
                                                결제 시 10% 즉시 할인 적용
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button 
                            className="w-full h-14 mt-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-lg shadow-md"
                            onClick={() => {
                                if (!workDate) return handleValidationError('workDate', '청소 날짜를 선택해주세요.')
                                if (!timePreference) return handleValidationError('timePreference', '희망 청소 시간을 선택해주세요.')
                                if (!address.trim()) return handleValidationError('address', '기본 주소를 검색하여 입력해주세요.')
                                if (!cleanType) return handleValidationError('cleanType', '청소 종류를 선택해주세요.')
                                if (!residentialType) return handleValidationError('residentialType', '주거 형태를 선택해주세요.')
                                if (!areaSize) return handleValidationError('areaSize', '평수를 입력해주세요.')
                                if (!customerName || !customerPhone) return handleValidationError('customerInfo', '고객 정보를 모두 입력해주세요.')
                                
                                setStep(2)
                            }}
                        >
                            다음 단계로 <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    </div>
                )}

                {/* 2. Notes & Photos */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="mb-2">
                            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <Camera className="w-6 h-6 text-teal-600" /> 다 왔어요!
                            </h2>
                            <p className="text-sm text-slate-500">현장 사진이나 특이사항을 알려주세요.</p>
                        </div>

                        <div className="space-y-5">
                            {/* 안내 요금 표 */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-3 text-[15px] flex items-center gap-1.5">
                                    💡 추가 요금 안내 (예상)
                                </h3>
                                <div className="space-y-4 text-[13px] text-slate-700">
                                    <div className="space-y-1.5">
                                        <h4 className="font-semibold text-teal-700 px-1 border-b border-teal-100 pb-1">오염도</h4>
                                        <ul className="space-y-2 bg-white rounded-lg p-3 border border-slate-100 divide-y divide-slate-50">
                                            <li className="flex justify-between pt-1 first:pt-0"><span className="text-slate-600">심한 곰팡이 제거</span> <span className="font-semibold text-slate-900">50,000원 ~</span></li>
                                            <li className="flex justify-between pt-2"><span className="text-slate-600">니코틴 오염</span> <span className="font-semibold text-slate-900">30,000원 ~</span></li>
                                            <li className="flex justify-between pt-2"><span className="text-slate-600">실리콘 곰팡이 제거</span> <span className="font-semibold text-slate-900">30,000원 ~</span></li>
                                            <li className="flex justify-between pt-2"><span className="text-slate-600">시트지, 스티커 제거</span> <span className="font-semibold text-slate-900">30,000원 ~</span></li>
                                            <li className="flex flex-col gap-0.5 pt-2"><div className="flex justify-between"><span className="text-slate-600">타일 줄눈 변색</span> <span className="font-semibold text-slate-900">30,000원 ~</span></div><span className="text-[11px] text-slate-400 break-keep">※ 완벽 복구 불가</span></li>
                                            <li className="flex flex-col gap-0.5 pt-2"><div className="flex justify-between"><span className="text-slate-600">쓰레기 제거</span> <span className="font-semibold text-slate-900">50,000원 ~</span></div><span className="text-[11px] text-slate-400 break-keep">※ 외부 배출 불가 (종량제 봉투 고객 지참)</span></li>
                                        </ul>
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="font-semibold text-teal-700 px-1 border-b border-teal-100 pb-1">별도시공</h4>
                                        <ul className="space-y-2 bg-white rounded-lg p-3 border border-slate-100 divide-y divide-slate-50">
                                            <li className="flex justify-between pt-1 first:pt-0"><span className="text-slate-600">빌트인 가전 청소</span> <span className="font-semibold text-slate-900">30,000원 ~</span></li>
                                            <li className="flex flex-col gap-0.5 pt-2"><div className="flex justify-between"><span className="text-slate-600">가구 내부 세척 추가</span> <span className="font-semibold text-slate-900">30,000원 ~</span></div><span className="text-[11px] text-slate-400">※ 기본 붙박이장 외</span></li>
                                        </ul>
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="font-semibold text-teal-700 px-1 border-b border-teal-100 pb-1">기타</h4>
                                        <ul className="space-y-2 bg-white rounded-lg p-3 border border-slate-100 divide-y divide-slate-50">
                                            <li className="flex justify-between pt-1 first:pt-0"><span className="text-slate-600">공실이 아닌 경우</span> <span className="font-semibold text-slate-900">30,000원 ~</span></li>
                                            <li className="flex justify-between pt-2"><span className="text-slate-600">대기 시간이 발생한 경우</span> <span className="font-semibold text-slate-900">30,000원 ~</span></li>
                                            <li className="flex justify-between pt-2"><span className="text-slate-600">베란다가 비확장형일 경우</span> <span className="font-semibold text-slate-900">30,000원 ~</span></li>
                                            <li className="flex justify-between pt-2"><span className="text-slate-600">사다리 작업이 추가될 경우</span> <span className="font-semibold text-slate-900">50,000원 ~</span></li>
                                            <li className="flex justify-between pt-2"><span className="text-slate-600">집구조, 평수가 다른 경우</span> <span className="font-semibold text-slate-900 break-keep text-right">분양평수 등 산정</span></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-700">추가 전달사항 (선택)</Label>
                                <Textarea 
                                    className="resize-none min-h-[120px] bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl p-3 leading-relaxed" 
                                    placeholder="오염도가 심한 곳이나 특별히 신경 써야 할 부분을 자유롭게 적어주세요."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3 p-4 border border-slate-100 bg-white rounded-xl shadow-sm">
                                <div className="space-y-1 border-b border-slate-100 pb-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-slate-800 font-bold">현장 사진 첨부</Label>
                                        {!noPhotos && <span className="text-xs text-slate-400 font-medium">{images.length} / 3</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">✨ 현장 사진은 <span className="text-teal-600 font-bold">선택 사항</span>입니다.</p>
                                </div>
                                <label className="flex items-center gap-2 mt-2 text-sm text-slate-700 cursor-pointer w-max select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={noPhotos}
                                        onChange={(e) => {
                                            setNoPhotos(e.target.checked)
                                            if (e.target.checked) setImages([])
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    사진 없음
                                </label>

                                {!noPhotos && (
                                    <div className="flex gap-3 overflow-x-auto pt-2 pb-1">
                                        {imagePreviewUrls.map((url, i) => (
                                            <div key={i} className="relative w-20 h-20 shrink-0 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt="preview" className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => removeImage(i)}
                                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {images.length < 3 && (
                                            <label className="w-20 h-20 shrink-0 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-teal-200 bg-teal-50 hover:bg-teal-100/50 cursor-pointer text-teal-600 transition-colors">
                                                <Camera className="w-6 h-6 mb-1" />
                                                <span className="text-[10px] font-medium">사진 추가</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    multiple 
                                                    className="hidden" 
                                                    onChange={handleImageChange}
                                                />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* 넥서스 AI 스마트 배정 매칭 */}
                            <div className="bg-slate-50 border border-teal-100 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-teal-400/20 to-blue-400/20 rounded-bl-[100px] pointer-events-none"></div>
                                <div className="flex items-center justify-between z-10">
                                    <div className="flex flex-col">
                                        <Label className="text-slate-800 font-bold mb-0.5 flex items-center gap-1.5">
                                            🚀 넥서스 AI 스마트 배정
                                        </Label>
                                        <span className="text-xs text-slate-500 max-w-[200px] leading-tight mt-1">
                                            접수 즉시 실시간으로 최적의 업체를 자동 매칭해드립니다. (제출 전용)
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setIsAutoAssign(!isAutoAssign)}
                                        className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${isAutoAssign ? 'bg-teal-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${isAutoAssign ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button 
                            className="w-full h-14 mt-6 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-lg shadow-md text-white font-bold"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    접수 중...
                                </>
                            ) : '청소 예약 띄우기 (완료)'}
                        </Button>
                    </div>
                )}
            </main>

            {/* Daum Postcode Modal */}
            {isPostcodeOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in slide-in-from-bottom-full duration-300">
                    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 px-4 h-14 flex items-center shadow-sm">
                        <button onClick={() => setIsPostcodeOpen(false)} className="p-2 -ml-2 text-slate-600">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div className="font-bold text-slate-800 text-lg ml-2">주소 검색</div>
                    </header>
                    <div className="flex-1 w-full bg-white relative">
                        <DaumPostcode 
                            onComplete={handleCompletePostcode} 
                            style={{ width: '100%', height: '100%' }} 
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
