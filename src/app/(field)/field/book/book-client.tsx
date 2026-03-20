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
import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

const CLEANING_TYPES = ['입주청소', '이사청소', '상가청소', '거주청소']
const SPECIAL_TAGS = ['오전 청소 요망', '오후 청소 요망', '쓰레기 처리 포함', '스팀 청소 필수', '외창 청소 추가', '곰팡이 제거', '새집증후군 시공']

export function FieldBookClient() {
    const router = useRouter()
    
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const supabase = createClient()

    // Form State
    const [address, setAddress] = useState('')
    const [detailAddress, setDetailAddress] = useState('')
    const [areaSize, setAreaSize] = useState('')
    const [price, setPrice] = useState('')
    
    const [workDate, setWorkDate] = useState('')
    const [cleanType, setCleanType] = useState('입주청소')
    
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [notes, setNotes] = useState('')
    
    const [images, setImages] = useState<File[]>([])
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])

    // Handlers
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag))
        } else {
            setSelectedTags([...selectedTags, tag])
        }
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
        if (!address.trim()) { toast.error('기본 주소를 입력해주세요.'); return }
        if (!workDate) { toast.error('청소 날짜를 지정해주세요.'); return }
        if (!areaSize) { toast.error('평수를 입력해주세요.'); return }
        if (!price) { toast.error('예상 금액(잔금)을 입력해주세요.'); return }

        setIsSubmitting(true)
        
        try {
            // 1. Upload Images
            let imageUrls: string[] = []
            if (images.length > 0) {
                imageUrls = await uploadImages()
            }

            // 2. Format region/notes
            // Admin format: "서울 강남구 30평 30만원" etc.
            const shortRegion = address.split(' ').slice(0, 2).join(' ') + ` ${areaSize}평 ${price}만원`
            const fullAddress = `${address} ${detailAddress}`.trim()
            
            const finalNotes = `
[요청타입] ${cleanType}
[특이사항 태그] ${selectedTags.length > 0 ? selectedTags.join(', ') : '없음'}
[상세 요청내용]
${notes}
            `.trim()

            const res = await createSharedOrder({
                region: shortRegion,
                address: fullAddress,
                area_size: `${areaSize}평`,
                work_date: workDate,
                notes: finalNotes,
                image_urls: imageUrls,
                customer_phone: '',
                customer_name: ''
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
                    신규 예약 (3단계 중 {step}단계)
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
                            <div className="space-y-2">
                                <Label className="text-slate-700">기본 주소 (동/호수 제외) *</Label>
                                <Input 
                                    className="h-12 text-base bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl" 
                                    placeholder="예: 서울 송파구 잠실동 123-45"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                />
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
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-slate-700">평수 (공급면적) *</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number"
                                            className="h-12 text-base bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl pr-10" 
                                            placeholder="32"
                                            value={areaSize}
                                            onChange={e => setAreaSize(e.target.value)}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">평</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700">예산 (결제금액) *</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number"
                                            className="h-12 text-base bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl pr-14" 
                                            placeholder="35"
                                            value={price}
                                            onChange={e => setPrice(e.target.value)}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">만원</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button 
                            className="w-full h-14 mt-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-lg shadow-md"
                            onClick={() => {
                                if (!address || !areaSize || !price) {
                                    toast.error('필수 정보를 모두 입력해주세요.')
                                    return
                                }
                                setStep(2)
                            }}
                        >
                            다음 단계로 <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    </div>
                )}

                {/* 2. Date & Type */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="mb-2">
                            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <Calendar className="w-6 h-6 text-teal-600" /> 언제가 좋을까요?
                            </h2>
                            <p className="text-sm text-slate-500">원하시는 청소 날짜와 종류를 선택해주세요.</p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
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

                            <div className="space-y-2">
                                <Label className="text-slate-700">요청 날짜 *</Label>
                                <Input 
                                    type="date"
                                    className="h-14 text-lg bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl" 
                                    value={workDate}
                                    onChange={e => setWorkDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]} // 오늘부터 선택 가능
                                />
                            </div>
                        </div>

                        <Button 
                            className="w-full h-14 mt-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-lg shadow-md"
                            onClick={() => {
                                if (!workDate) {
                                    toast.error('날짜를 꼭 선택해주세요.')
                                    return
                                }
                                setStep(3)
                            }}
                        >
                            다음 단계로 <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    </div>
                )}

                {/* 3. Notes & Photos */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="mb-2">
                            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <Camera className="w-6 h-6 text-teal-600" /> 다 왔어요!
                            </h2>
                            <p className="text-sm text-slate-500">현장 사진이나 특이사항을 알려주세요.</p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-3">
                                <Label className="text-slate-700">빠른 특이사항 태그</Label>
                                <div className="flex flex-wrap gap-2">
                                    {SPECIAL_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`p-2 px-3 rounded-full text-xs font-semibold transition-colors border ${
                                                selectedTags.includes(tag)
                                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-700">추가 전달사항 (선택)</Label>
                                <Textarea 
                                    className="resize-none min-h-[100px] bg-slate-50 border-transparent focus:bg-white focus:border-teal-500 rounded-xl p-3" 
                                    placeholder="오염도가 심한 곳이나 특별히 신경 써야 할 부분을 자유롭게 적어주세요."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-slate-700">현장 사진 첨부 (최대 3장)</Label>
                                    <span className="text-xs text-slate-400 font-medium">{images.length} / 3</span>
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {imagePreviewUrls.map((url, i) => (
                                        <div key={i} className="relative w-20 h-20 shrink-0 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={url} alt="preview" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => removeImage(i)}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
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
        </div>
    )
}
