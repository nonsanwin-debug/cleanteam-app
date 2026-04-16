'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Loader2, MapPin, Calendar, Camera, X, Zap } from 'lucide-react'
import DaumPostcode from 'react-daum-postcode'
import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import { createCustomerOrder } from '@/actions/customer-order'

const CLEANING_TYPES = ['입주청소', '이사청소', '거주청소', '사이청소', '상가청소', '특수청소']
const TIME_PREFS = ['오전 청소 요망', '오후 청소 요망', '시간 협의']
const STRUCTURE_TYPES = ['아파트', '빌라', '주택', '오피스텔', '상가', '원룸', '투룸']

export function CustomerBookClient({ partnerId, rewardType, partnerName = '', freeOldBuilding = false, freeInterior = false }: { partnerId: string, rewardType: 'discount' | 'points', partnerName?: string, freeOldBuilding?: boolean, freeInterior?: boolean }) {
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
    
    const [workDate, setWorkDate] = useState('')
    const [timePreference, setTimePreference] = useState('')
    const [cleanType, setCleanType] = useState('')
    const [residentialType, setResidentialType] = useState('')
    const [structureType, setStructureType] = useState('')
    const [buildingCondition, setBuildingCondition] = useState('신축')
    const [isAutoAssign, setIsAutoAssign] = useState(true)

    const [notes, setNotes] = useState('공동 현관 비밀번호 : \n세대 비밀번호 : \n전달 사항 : ')
    const [noPhotos, setNoPhotos] = useState(false)
    const [images, setImages] = useState<File[]>([])
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
    const [errorField, setErrorField] = useState<string | null>(null)

    const handleValidationError = (fieldId: string, message: string, fieldStep: number = 1) => {
        toast.error(message)
        const applyScroll = () => {
            const el = document.getElementById(`field-${fieldId}`)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setErrorField(fieldId)
                setTimeout(() => setErrorField(null), 2000)
            }
        }
        if (step !== fieldStep) {
            setStep(fieldStep)
            setTimeout(applyScroll, 150)
        } else {
            applyScroll()
        }
    }

    const getPricePerPyeong = (type: string) => {
        if (type === '입주청소' || type === '이사청소') return 12000
        if (type === '거주청소') return 13000
        if (type === '사이청소') return 12000
        return 12000
    }
    const isNegotiatedType = (type: string) => type === '상가청소' || type === '특수청소'

    const handleCompletePostcode = (data: any) => {
        let fullAddress = data.address
        let extraAddress = ''
        if (data.addressType === 'R') {
            if (data.bname !== '') extraAddress += data.bname
            if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : ''
        }
        setAddress(fullAddress)
        setIsPostcodeOpen(false)
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            if (images.length + newFiles.length > 3) {
                toast.error('사진은 최대 3장까지만 첨부할 수 있습니다.')
                return
            }
            setImages([...images, ...newFiles])
            const newPreviews = newFiles.map(file => URL.createObjectURL(file))
            setImagePreviewUrls([...imagePreviewUrls, ...newPreviews])
        }
    }

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
        URL.revokeObjectURL(imagePreviewUrls[index])
        setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index))
    }

    const getCalculatedBasePrice = () => {
        if (!cleanType || isNegotiatedType(cleanType)) return 0
        const parsedArea = parseInt(areaSize, 10) || 0
        const pricePerPyeong = getPricePerPyeong(cleanType)
        const conditionAddPerPyeong = buildingCondition === '구축' 
            ? (freeOldBuilding ? 0 : 2000) 
            : (buildingCondition === '인테리어' ? (freeInterior ? 0 : 4000) : 0)
        const addBaseFlatPrice = cleanType === '사이청소' ? 70000 : 0
        let calculatedPrice = parsedArea * (pricePerPyeong + conditionAddPerPyeong) + addBaseFlatPrice
        if (calculatedPrice < 150000) calculatedPrice = 150000
        // 10% 할인 선택 시 할인 적용
        if (rewardType === 'discount') {
            calculatedPrice = Math.floor(calculatedPrice * 0.9)
        }
        return calculatedPrice
    }

    const uploadImages = async (): Promise<string[]> => {
        const uploadedUrls: string[] = []
        for (const file of images) {
            const fileExt = file.name.split('.').pop()
            const fileName = `customer_order_${uuidv4()}.${fileExt}`
            const filePath = `shared_orders/${fileName}`
            const { error } = await supabase.storage.from('photos').upload(filePath, file)
            if (!error) {
                const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath)
                uploadedUrls.push(publicUrl)
            }
        }
        return uploadedUrls
    }

    const handleSubmit = async () => {
        if (!address) return handleValidationError('address', '주소를 입력해주세요.')
        if (!areaSize) return handleValidationError('areaSize', '평수를 입력해주세요.')
        if (!customerName) return handleValidationError('customerName', '고객 이름을 입력해주세요.')
        if (!customerPhone) return handleValidationError('customerPhone', '고객 연락처를 입력해주세요.')
        if (!cleanType) return handleValidationError('cleanType', '청소 종류를 선택해주세요.')
        if (!workDate) return handleValidationError('workDate', '작업 희망일을 선택해주세요.', 2)

        setIsSubmitting(true)
        try {
            let uploadedImageUrls: string[] = []
            if (images.length > 0) {
                uploadedImageUrls = await uploadImages()
            }

            const fullAddress = detailAddress ? `${address} ${detailAddress}` : address
            const estimatedPrice = getCalculatedBasePrice()

            const result = await createCustomerOrder({
                address: fullAddress,
                area_size: areaSize,
                customer_name: customerName,
                customer_phone: customerPhone,
                cleaning_type: cleanType,
                work_date: workDate,
                time_preference: timePreference || null,
                residential_type: residentialType || null,
                structure_type: structureType || null,
                building_condition: buildingCondition,
                notes: notes || null,
                photos: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
                partner_id: partnerId,
                reward_type: rewardType,
                estimated_price: estimatedPrice > 0 ? estimatedPrice : null,
                is_auto_assign: isAutoAssign,
            })

            if (!result.success) throw new Error(result.error)

            toast.success('예약이 성공적으로 접수되었습니다!')
            router.push(`/book/p/complete?id=${result.orderId}`)
        } catch (err: any) {
            console.error(err)
            toast.error('예약 접수에 실패했습니다. 다시 시도해주세요.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        {step > 1 ? (
                            <button onClick={() => setStep(step - 1)} className="w-8 h-8 -ml-2 mr-1 rounded-full hover:bg-slate-100 flex items-center justify-center">
                                <ChevronLeft className="w-5 h-5 text-slate-700" />
                            </button>
                        ) : (
                            <div className="w-8 h-8 -ml-2 mr-1" />
                        )}
                        <span className="font-bold text-slate-800 text-sm">NEXUS 청소 예약</span>
                    </div>
                    <a href="tel:1644-4354" className="text-xs text-slate-500 font-medium">1644-4354</a>
                </div>
                {/* Step Indicator */}
                <div className="max-w-md mx-auto px-4 pb-2">
                    <div className="flex gap-1">
                        {[1, 2].map(s => (
                            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-teal-500' : 'bg-slate-200'}`} />
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">
                {step === 1 && (
                    <>
                        {/* 주소 */}
                        <div id="field-address" className={`space-y-2 ${errorField === 'address' ? 'animate-bounce ring-2 ring-red-400 ring-offset-2 rounded-xl' : ''}`}>
                            <Label className="text-sm font-bold flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-teal-500" />
                                주소 <span className="text-red-500">*</span>
                            </Label>
                            <Button variant="outline" className="w-full justify-start h-12 text-left" onClick={() => setIsPostcodeOpen(true)}>
                                {address || '주소를 검색해주세요'}
                            </Button>
                            {isPostcodeOpen && (
                                <div className="border rounded-xl overflow-hidden">
                                    <DaumPostcode onComplete={handleCompletePostcode} style={{ height: 400 }} />
                                </div>
                            )}
                            <Input placeholder="상세주소 (동/호수)" value={detailAddress} onChange={e => setDetailAddress(e.target.value)} className="h-12" />
                        </div>

                        {/* 평수 */}
                        <div id="field-areaSize" className={`space-y-2 ${errorField === 'areaSize' ? 'animate-bounce ring-2 ring-red-400 ring-offset-2 rounded-xl' : ''}`}>
                            <Label className="text-sm font-bold">평수 (공급면적 기준) <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input type="number" inputMode="numeric" value={areaSize} onChange={e => setAreaSize(e.target.value)} placeholder="예: 32" className="h-12 pr-10" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">평</span>
                            </div>
                        </div>

                        {/* 고객 정보 */}
                        <div className="space-y-3 border-t border-slate-200 pt-4">
                            <h3 className="font-bold text-slate-800">고객 정보</h3>
                            <div id="field-customerName" className={`space-y-1 ${errorField === 'customerName' ? 'animate-bounce ring-2 ring-red-400 ring-offset-2 rounded-xl' : ''}`}>
                                <Label className="text-sm font-bold">이름 <span className="text-red-500">*</span></Label>
                                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="고객 이름" className="h-12" />
                            </div>
                            <div id="field-customerPhone" className={`space-y-1 ${errorField === 'customerPhone' ? 'animate-bounce ring-2 ring-red-400 ring-offset-2 rounded-xl' : ''}`}>
                                <Label className="text-sm font-bold">연락처 <span className="text-red-500">*</span></Label>
                                <Input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="010-0000-0000" className="h-12" />
                            </div>
                        </div>

                        {/* 청소 종류 */}
                        <div id="field-cleanType" className={`space-y-2 ${errorField === 'cleanType' ? 'animate-bounce ring-2 ring-red-400 ring-offset-2 rounded-xl' : ''}`}>
                            <Label className="text-sm font-bold">청소 종류 <span className="text-red-500">*</span></Label>
                            <div className="grid grid-cols-3 gap-2">
                                {CLEANING_TYPES.map(t => (
                                    <button key={t} onClick={() => setCleanType(t)}
                                        className={`py-3 rounded-xl text-sm font-semibold transition-all border ${cleanType === t ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'}`}
                                    >{t}</button>
                                ))}
                            </div>
                        </div>

                        {/* 주거 형태 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold">주거 형태</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {STRUCTURE_TYPES.map(t => (
                                    <button key={t} onClick={() => setStructureType(t)}
                                        className={`py-2.5 rounded-xl text-xs font-semibold transition-all border ${structureType === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'}`}
                                    >{t}</button>
                                ))}
                            </div>
                        </div>

                        {/* 건물 상태 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold">건물 상태</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {['신축', '구축', '인테리어'].map(c => (
                                    <button key={c} onClick={() => setBuildingCondition(c)}
                                        className={`py-3 rounded-xl text-sm font-semibold transition-all border ${buildingCondition === c ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200'}`}
                                    >{c}</button>
                                ))}
                            </div>
                        </div>




                        <Button onClick={() => setStep(2)} className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-white text-base font-bold rounded-2xl">
                            다음 <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    </>
                )}

                {step === 2 && (
                    <>
                        {/* 작업 희망일 */}
                        <div id="field-workDate" className={`space-y-2 ${errorField === 'workDate' ? 'animate-bounce ring-2 ring-red-400 ring-offset-2 rounded-xl' : ''}`}>
                            <Label className="text-sm font-bold flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-teal-500" />
                                작업 희망일 <span className="text-red-500">*</span>
                            </Label>
                            <Input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} className="h-12" />
                        </div>

                        {/* 시간 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold">시간 선호</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {TIME_PREFS.map(t => (
                                    <button key={t} onClick={() => setTimePreference(t)}
                                        className={`py-3 rounded-xl text-xs font-semibold transition-all border ${timePreference === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200'}`}
                                    >{t}</button>
                                ))}
                            </div>
                        </div>

                        {/* 사진 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold flex items-center gap-1.5">
                                <Camera className="w-4 h-4 text-teal-500" />
                                현장 사진 (선택)
                            </Label>
                            {imagePreviewUrls.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {imagePreviewUrls.map((url, i) => (
                                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border">
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                            <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {images.length < 3 && (
                                <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 cursor-pointer hover:border-teal-400 transition-colors">
                                    <Camera className="w-4 h-4" /> 사진 추가 (최대 3장)
                                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                                </label>
                            )}
                        </div>

                        {/* 메모 */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold">전달 사항</Label>
                            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="resize-none" />
                        </div>

                        {/* 예상 견적 상세 */}
                        {getCalculatedBasePrice() > 0 && (() => {
                            const parsedArea = parseInt(areaSize, 10) || 0
                            const pricePerPyeong = getPricePerPyeong(cleanType)
                            const isFreeOld = buildingCondition === '구축' && freeOldBuilding
                            const isFreeInt = buildingCondition === '인테리어' && freeInterior
                            const condAdd = buildingCondition === '구축' ? (isFreeOld ? 0 : 2000) : (buildingCondition === '인테리어' ? (isFreeInt ? 0 : 4000) : 0)
                            const baseTotal = parsedArea * pricePerPyeong
                            const condTotal = parsedArea * condAdd
                            const addFlat = cleanType === '사이청소' ? 70000 : 0
                            let rawTotal = baseTotal + condTotal + addFlat
                            if (rawTotal < 150000) rawTotal = 150000
                            const finalPrice = rewardType === 'discount' ? Math.floor(rawTotal * 0.9) : rawTotal
                            const discountAmount = rewardType === 'discount' ? rawTotal - finalPrice : 0

                            return (
                                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                                    <h4 className="font-bold text-slate-800">예상 견적 상세</h4>
                                    <div className="space-y-1.5 text-sm">
                                        <div className="flex justify-between text-slate-600">
                                            <span>{cleanType} 기본단가 ({parsedArea}평 × {pricePerPyeong.toLocaleString()}원)</span>
                                            <span className="font-medium">{baseTotal.toLocaleString()}원</span>
                                        </div>
                                        {condTotal > 0 && (
                                            <div className="flex justify-between text-slate-600">
                                                <span>{buildingCondition} 할증 ({parsedArea}평 × {condAdd.toLocaleString()}원)</span>
                                                <span className="font-medium">+{condTotal.toLocaleString()}원</span>
                                            </div>
                                        )}
                                        {(isFreeOld || isFreeInt) && (
                                            <div className="flex justify-between text-teal-600">
                                                <span>✨ {buildingCondition} 할증 무료 적용</span>
                                                <span className="font-medium">-0원</span>
                                            </div>
                                        )}
                                        {addFlat > 0 && (
                                            <div className="flex justify-between text-slate-600">
                                                <span>사이청소 기본 추가</span>
                                                <span className="font-medium">+{addFlat.toLocaleString()}원</span>
                                            </div>
                                        )}
                                        {rawTotal === 150000 && baseTotal + condTotal + addFlat < 150000 && (
                                            <div className="flex justify-between text-slate-500 text-xs">
                                                <span>최소 금액 적용</span>
                                                <span>150,000원</span>
                                            </div>
                                        )}
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between text-red-500 font-medium">
                                                <span className="leading-snug">NEXUS 제휴파트너<br/>{partnerName} 견적할인 10%</span>
                                                <span className="whitespace-nowrap ml-2">-{discountAmount.toLocaleString()}원</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                                        <span className="font-bold text-slate-700">예상 결제 금액</span>
                                        <span className="text-2xl font-extrabold text-slate-800">
                                            {finalPrice.toLocaleString()}<span className="text-sm font-medium text-slate-400 ml-1">원</span>
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">※ 실제 금액은 현장 확인 후 변동될 수 있습니다</p>
                                    <p className="text-[10px] text-slate-400">※ 부가세 별도 금액입니다</p>
                                </div>
                            )
                        })()}

                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-white text-base font-bold rounded-2xl disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '예약 접수하기'}
                        </Button>
                    </>
                )}
            </main>
        </div>
    )
}
