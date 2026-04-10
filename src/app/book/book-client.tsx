'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitCustomerInquiry } from '@/actions/customer-booking'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Loader2, MapPin, Calendar, Camera, User, Sparkles, Tag, CheckCircle2, X } from 'lucide-react'
import DaumPostcode from 'react-daum-postcode'
import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import { Card } from '@/components/ui/card'

const CLEANING_TYPES = ['입주청소', '이사청소', '거주청소', '사이청소', '상가청소', '특수청소']
const TIME_PREFS = ['오전 (08시~12시)', '오후 (13시~18시)', '시간 협의']
const STRUCTURE_TYPES = ['아파트', '빌라', '주택', '오피스텔', '원룸/투룸', '상가']

export function CustomerBookClient() {
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
    const [structureType, setStructureType] = useState('')
    const [buildingCondition, setBuildingCondition] = useState('신축')
    
    const [notes, setNotes] = useState('')
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
        applyScroll()
    }

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
            const newPreviews = newFiles.map(file => URL.createObjectURL(file))
            setImagePreviewUrls([...imagePreviewUrls, ...newPreviews])
        }
    }

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
        URL.revokeObjectURL(imagePreviewUrls[index])
        setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index))
    }

    const uploadImages = async (): Promise<string[]> => {
        const uploadedUrls: string[] = []
        for (const file of images) {
            const fileExt = file.name.split('.').pop()
            const fileName = `customer_inquiry_${uuidv4()}.${fileExt}`
            const filePath = `customer_inquiries/${fileName}`
            
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

    const validateStep1 = () => {
        if (!cleanType) return handleValidationError('cleanType', '청소 종류를 선택해주세요.')
        if (!structureType) return handleValidationError('structureType', '건물 형태를 선택해주세요.')
        if (!areaSize) return handleValidationError('areaSize', '평수를 입력해주세요.')
        setStep(2)
    }

    const validateStep2 = () => {
        if (!address.trim()) return handleValidationError('address', '기본 주소를 입력해주세요.')
        if (!workDate) return handleValidationError('workDate', '희망 청소 날짜를 지정해주세요.')
        if (!timePreference) return handleValidationError('timePreference', '희망 시간을 선택해주세요.')
        setStep(3)
    }

    const handleSubmit = async () => {
        if (!customerName || !customerPhone) return handleValidationError('customerInfo', '연락처 정보를 입력해주세요.')

        setIsSubmitting(true)
        try {
            let imageUrls: string[] = []
            if (images.length > 0) {
                imageUrls = await uploadImages()
            }

            const res = await submitCustomerInquiry({
                customer_name: customerName,
                customer_phone: customerPhone,
                clean_type: cleanType,
                structure_type: structureType,
                address: address,
                detail_address: detailAddress,
                area_size: areaSize + '평',
                work_date: workDate,
                time_preference: timePreference,
                building_condition: buildingCondition,
                notes: notes,
                image_urls: imageUrls,
            })

            if (res.success) {
                toast.success('견적 상담 신청이 완료되었습니다!', { description: '전문 상담원이 곧 연락드릴 예정입니다.' })
                setStep(4) // Success Page
            } else {
                throw new Error(res.error)
            }
        } catch (error: any) {
            toast.error(error.message || '예약 접수 중 오류가 발생했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (step === 4) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg border border-slate-100">
                    <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-4">접수가 완료되었습니다!</h2>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        상담 신청이 정상적으로 완료되었습니다.<br/><br/>
                        보내주신 소중한 정보 확인 후,<br/>
                        담당자가 신속하게 연락드리겠습니다.<br/><br/>
                        감사합니다.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-[100dvh] bg-slate-50 font-sans">
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 h-14 flex items-center justify-between">
                <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="font-bold text-slate-800 flex items-center gap-2 text-base">
                    엄선 업체 비교 견적 ({step}/3)
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 max-w-md w-full mx-auto p-5 pb-32">
                
                {/* Event Banner */}
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-4 text-white shadow-md mb-8 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                            <span className="font-bold text-sm text-yellow-100 uppercase tracking-widest">Special Event</span>
                        </div>
                        <h3 className="font-black text-lg mb-1 leading-tight">상담 예약 시 특별 혜택!</h3>
                        <ul className="text-[13px] text-teal-50 space-y-1 font-medium mt-3 font-semibold">
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-yellow-300" /> 총 결제 금액 10% 할인 쿠폰</li>
                            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-yellow-300" /> 전체 공간 피톤치드 무료 시공</li>
                        </ul>
                        <div className="mt-3 bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-500/30 p-2.5 animate-pulse">
                            <p className="text-[13px] text-yellow-100 font-bold leading-snug">
                                🔥 <span className="text-white">이사 시즌 예약 마감 임박!</span><br/>지금 신청해야 안전한 일정 선점이 가능합니다.
                            </p>
                        </div>
                    </div>
                    <Tag className="absolute -right-4 -bottom-4 w-24 h-24 text-teal-400 opacity-20 rotate-[-15deg]" />
                </div>


                {/* Step 1: Clean Type & Structure */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4" id="field-cleanType">
                            <Label className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm">1</span>
                                어떤 청소가 필요하신가요?
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                {CLEANING_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setCleanType(type)}
                                        className={`p-4 rounded-xl border-2 transition-all font-bold text-[15px] ${
                                            cleanType === type 
                                                ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm' 
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4" id="field-structureType">
                            <Label className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm">2</span>
                                건물 형태를 선택해주세요
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                                {STRUCTURE_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setStructureType(type)}
                                        className={`py-3 px-2 rounded-xl border-2 transition-all font-semibold text-sm ${
                                            structureType === type 
                                                ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm' 
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4" id="field-areaSize">
                            <Label className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm">3</span>
                                공급 면적(평수)은 어떻게 되나요?
                            </Label>
                            <div className="relative border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                                <Input 
                                    type="number"
                                    value={areaSize} 
                                    onChange={(e) => setAreaSize(e.target.value)} 
                                    placeholder="예: 32" 
                                    className="h-14 font-bold text-lg border-0 focus-visible:ring-0 px-4 bg-transparent outline-none"
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">평</div>
                            </div>
                        </div>

                        <div className="space-y-4" id="field-condition">
                            <Label className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm">4</span>
                                신축인가요 구축인가요?
                            </Label>
                            <div className="flex gap-2">
                                {['신축', '구축', '인테리어 후'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setBuildingCondition(type)}
                                        className={`flex-1 py-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                                            buildingCondition === type 
                                                ? 'border-teal-500 bg-teal-50 text-teal-800' 
                                                : 'border-slate-200 bg-white text-slate-600'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Details */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4" id="field-address">
                            <Label className="text-base font-bold text-slate-800">어디로 방문할까요?</Label>
                            <div className="flex gap-2">
                                <Input readOnly value={address} placeholder="기본 주소" className="bg-slate-50 h-12" onClick={() => setIsPostcodeOpen(true)} />
                                <Button type="button" onClick={() => setIsPostcodeOpen(true)} className="h-12 bg-slate-800 whitespace-nowrap px-6">검색</Button>
                            </div>
                        </div>



                        <div className="space-y-4" id="field-workDate">
                            <Label className="text-base font-bold text-slate-800">희망 청소 날짜</Label>
                            <Input 
                                type="date" 
                                value={workDate} 
                                onChange={(e) => setWorkDate(e.target.value)}
                                className="h-14 font-bold border-slate-300 text-slate-700 w-full appearance-none pr-4" 
                            />
                        </div>

                        <div className="space-y-4" id="field-timePreference">
                            <Label className="text-base font-bold text-slate-800">원하시는 시간대</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {TIME_PREFS.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setTimePreference(type)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all font-semibold ${
                                            timePreference === type 
                                                ? 'border-teal-500 bg-teal-50 text-teal-800' 
                                                : 'border-slate-200 bg-white text-slate-600'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Contact & Submit */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <section className="bg-slate-100 p-5 rounded-2xl space-y-4" id="field-customerInfo">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <User className="w-5 h-5 text-slate-500" /> 연락처를 남겨주세요
                            </h3>
                            <div className="space-y-3">
                                <Input 
                                    placeholder="고객명 (예: 홍길동)" 
                                    value={customerName} 
                                    onChange={e => setCustomerName(e.target.value)} 
                                    className="h-14 font-semibold text-lg bg-white border-0 shadow-sm"
                                />
                                <Input 
                                    type="tel"
                                    placeholder="연락처 (예: 010-1234-5678)" 
                                    value={customerPhone} 
                                    onChange={e => setCustomerPhone(e.target.value)} 
                                    className="h-14 font-semibold text-lg bg-white border-0 shadow-sm"
                                />
                                <p className="text-xs text-slate-500 mt-2">입력하신 연락처로 전문가가 전화를 드립니다.</p>
                            </div>
                        </section>

                        <div className="space-y-4">
                            <Label className="text-base font-bold text-slate-800">추가 요청사항 및 전할 말씀</Label>
                            <textarea 
                                className="w-full min-h-[120px] p-4 text-sm border-2 rounded-xl focus:ring-0 focus:border-teal-500 bg-white border-slate-200 outline-none"
                                placeholder="특별히 오염이 심한 곳이나 주의해야 할 곳이 있다면 자유롭게 적어주세요!"
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Camera className="w-5 h-5 text-slate-400" /> (선택) 사진 첨부 <span className="text-sm font-normal text-slate-400 ml-1">최대 3장</span>
                            </Label>
                            
                            <div className="flex flex-wrap gap-2">
                                {imagePreviewUrls.map((url, i) => (
                                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                                        <img src={url} alt="첨부 미리보기" className="object-cover w-full h-full" />
                                        <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {images.length < 3 && (
                                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl leading-none font-light">+</span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Fixed Area */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-safe-bottom z-30 flex justify-center">
                <div className="max-w-md w-full">
                    {step === 1 && (
                        <Button 
                            className="w-full text-lg font-bold h-14 rounded-xl bg-teal-600 hover:bg-teal-700 shadow-md text-white" 
                            onClick={validateStep1}
                        >
                            30초 만에 무료 견적 신청하기 <ChevronRight className="ml-1 w-5 h-5" />
                        </Button>
                    )}
                    {step === 2 && (
                        <Button 
                            className="w-full text-lg font-bold h-14 rounded-xl bg-teal-600 hover:bg-teal-700 shadow-md text-white" 
                            onClick={validateStep2}
                        >
                            거의 다 왔어요! <ChevronRight className="ml-1 w-5 h-5" />
                        </Button>
                    )}
                    {step === 3 && (
                        <Button 
                            className="w-full text-lg font-bold h-14 rounded-xl bg-slate-900 hover:bg-slate-800 shadow-xl text-white" 
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            {isSubmitting ? '접수 중...' : '견적 상담 신청하기 🎉'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Postcode Modal */}
            {isPostcodeOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-white sm:rounded-2xl h-[80vh] sm:h-[600px] flex flex-col relative animate-in slide-in-from-bottom-8">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-bold text-lg">주소 검색</h3>
                            <button onClick={() => setIsPostcodeOpen(false)} className="p-2 -mr-2 text-slate-500 rounded-full hover:bg-slate-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <DaumPostcode
                                onComplete={handleCompletePostcode}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
