'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Megaphone, Eye, MousePointerClick, RefreshCw, Activity, AlertCircle, Link, Image as ImageIcon, MapPin, Phone } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { createAd, deleteAd, updateAdStatus } from '@/actions/ads'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export function MasterAdsClient({ initialAds }: { initialAds: any[] }) {
    const router = useRouter()
    const [ads, setAds] = useState(initialAds)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)

    // Form states
    const [title, setTitle] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [linkUrl, setLinkUrl] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [placement, setPlacement] = useState('share_above_text')
    const [maxImpressions, setMaxImpressions] = useState('1000')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.')
            return
        }

        setUploadingImage(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
            const filePath = `ads/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('photos') // Reusing photos bucket for simplicity, or create an 'ads' bucket if preferred. Assuming 'photos' is public.
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('photos')
                .getPublicUrl(filePath)

            setImageUrl(publicUrl)
        } catch (error: any) {
            console.error('Error uploading image:', error)
            alert('이미지 업로드에 실패했습니다: ' + error.message)
        } finally {
            setUploadingImage(false)
        }
    }

    const resetForm = () => {
        setTitle('')
        setImageUrl('')
        setLinkUrl('')
        setPhoneNumber('')
        setPlacement('share_above_text')
        setMaxImpressions('1000')
    }

    const handleCreateSubmit = async () => {
        if (!title || !imageUrl) {
            alert('광고명, 배너 이미지를 입력해주세요.')
            return
        }
        
        if (!linkUrl && !phoneNumber) {
            alert('클릭 시 이동할 링크나 연락처 중 하나는 필수로 입력해야 합니다.')
            return
        }

        const maxImpParsed = parseInt(maxImpressions)
        if (isNaN(maxImpParsed) || maxImpParsed <= 0) {
            alert('목표 노출 수를 올바르게 입력해주세요. (1 이상)')
            return
        }

        setIsUpdating(true)
        const result = await createAd({
            title,
            image_url: imageUrl,
            link_url: linkUrl || undefined,
            phone_number: phoneNumber || undefined,
            placement,
            is_active: true,
            max_impressions: maxImpParsed
        })
        setIsUpdating(false)

        if (result.success) {
            setIsDialogOpen(false)
            resetForm()
            alert('광고가 성공적으로 등록 되었습니다.')
            router.refresh() // Rely on server component re-fetching
        } else {
            alert(result.error || '광고 등록에 실패했습니다.')
        }
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setIsUpdating(true)
        const result = await updateAdStatus(id, !currentStatus)
        setIsUpdating(false)

        if (result.success) {
            // Optimistic update
            setAds(prev => prev.map(ad => ad.id === id ? { ...ad, is_active: !currentStatus } : ad))
        } else {
            alert(result.error)
        }
    }

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`'${title}' 배너를 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 없으며 통계 기록도 함께 삭제됩니다.`)) return

        setIsUpdating(true)
        const result = await deleteAd(id)
        setIsUpdating(false)

        if (result.success) {
            setAds(prev => prev.filter(ad => ad.id !== id))
        } else {
            alert(result.error)
        }
    }

    const getPlacementName = (p: string) => {
        switch (p) {
            case 'share_above_text': return '상단: 작업 완료 텍스트 위'
            case 'share_above_signature': return '하단: 고객 서명 라벨 위'
            default: return p
        }
    }

    const getProgressColor = (current: number, max: number) => {
        const percent = (current / max) * 100
        if (percent >= 100) return 'bg-slate-300'
        if (percent >= 80) return 'bg-amber-500'
        return 'bg-indigo-500'
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-indigo-600" />
                        배너 광고 관리
                    </h1>
                    <p className="text-slate-500 mt-1">
                        고객 공유(Share) 페이지에 노출될 배너 광고를 등록하고 통계를 확인합니다.
                    </p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" />
                            새 배너 등록
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>새 배너 광고 추가</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">광고명 (관리용)</Label>
                                <Input id="title" placeholder="예: 봄맞이 에어컨 청소 할인 이벤트" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>노출 위치</Label>
                                <Select value={placement} onValueChange={setPlacement}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="위치 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="share_above_text">상단: 작업 완료 텍스트 위</SelectItem>
                                        <SelectItem value="share_above_signature">하단: 고객 서명 라벨 위</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">배너 이미지</Label>
                                {imageUrl ? (
                                    <div className="relative w-full aspect-[21/9] rounded-md overflow-hidden border border-slate-200 bg-slate-50">
                                        <Image src={imageUrl} alt="Banner Preview" fill className="object-cover" />
                                        <Button variant="destructive" size="sm" className="absolute top-2 right-2 h-7" onClick={() => setImageUrl('')}>
                                            <Trash2 className="w-3 h-3 mr-1" /> 제거
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center w-full">
                                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                {uploadingImage ? (
                                                    <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-2" />
                                                ) : (
                                                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                                                )}
                                                <p className="mb-2 text-sm text-slate-500 font-semibold">{uploadingImage ? '업로드 중...' : '클릭하여 이미지 업로드'}</p>
                                                <p className="text-xs text-slate-500">권장 비율 21:9 (PNG, JPG)</p>
                                            </div>
                                            <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="link">클릭 시 이동할 링크 (URL) <span className="text-slate-400 font-normal ml-1">(선택)</span></Label>
                                <Input id="link" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">업체 연락처 (전화걸기) <span className="text-slate-400 font-normal ml-1">(선택)</span></Label>
                                <Input id="phone" placeholder="010-0000-0000" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                                <p className="text-xs text-slate-500 mt-1">* 링크와 연락처 둘 다 입력 시 링크가 우선 작동합니다.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="limit">목표 노출 수 (제한)</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="limit" type="number" min="1" value={maxImpressions} onChange={e => setMaxImpressions(e.target.value)} className="w-32" />
                                    <span className="text-sm text-slate-500">회 노출 후 자동 중단</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleCreateSubmit} disabled={isUpdating || uploadingImage}>
                                {(isUpdating || uploadingImage) && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                                등록 완료
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {ads.length === 0 ? (
                <Card className="border-dashed bg-slate-50">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <Megaphone className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">등록된 배너 광고가 없습니다</h3>
                        <p className="text-sm mt-1">상단의 '새 배너 등록' 버튼을 눌러 광고를 추가해보세요.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ads.map(ad => {
                        const isExpired = ad.impressions_count >= ad.max_impressions
                        const isActive = ad.is_active && !isExpired
                        const progressPercent = Math.min((ad.impressions_count / ad.max_impressions) * 100, 100)
                        
                        return (
                            <Card key={ad.id} className={`overflow-hidden transition-all duration-200 ${!ad.is_active || isExpired ? 'opacity-80 grayscale-[0.3]' : 'border-indigo-100 shadow-md ring-1 ring-indigo-50'}`}>
                                <div className="relative aspect-[21/9] w-full bg-slate-100 border-b border-slate-100">
                                    <Image src={ad.image_url} alt={ad.title} fill className="object-cover" />
                                    {!isActive && (
                                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-10 backdrop-blur-[1px]">
                                            <Badge variant="secondary" className="bg-slate-800 text-white font-bold border-none text-xs">
                                                {isExpired ? '목표 도달 완료' : '사용 안함'}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4 space-y-4">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className="font-bold text-slate-800 line-clamp-1 flex-1">{ad.title}</h3>
                                            <Switch 
                                                checked={ad.is_active} 
                                                onCheckedChange={() => handleToggleStatus(ad.id, ad.is_active)}
                                                disabled={isUpdating}
                                            />
                                        </div>
                                        <div className="flex items-center text-xs text-slate-500 gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {getPlacementName(ad.placement)}
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                                                <Eye className="w-3.5 h-3.5 text-indigo-500" /> 총 노출 수
                                            </div>
                                            <div className="text-lg font-bold text-slate-800 tracking-tight">
                                                {ad.impressions_count.toLocaleString()}<span className="text-xs text-slate-400 font-normal ml-1">/ {ad.max_impressions.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                                                <MousePointerClick className="w-3.5 h-3.5 text-emerald-500" /> 총 클릭 수
                                            </div>
                                            <div className="text-lg font-bold text-slate-800 tracking-tight">
                                                {ad.clicks_count.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-medium text-slate-500">
                                            <span>달성률</span>
                                            <span>{progressPercent.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${getProgressColor(ad.impressions_count, ad.max_impressions)}`} 
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                                        {ad.link_url && (
                                            <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100 truncate">
                                                <Link className="w-3.5 h-3.5 min-w-3.5 mr-1.5 text-slate-400" />
                                                <span className="truncate">{ad.link_url}</span>
                                            </div>
                                        )}
                                        {ad.phone_number && (
                                            <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100 truncate">
                                                <Phone className="w-3.5 h-3.5 min-w-3.5 mr-1.5 text-slate-400" />
                                                <span className="truncate font-mono">{ad.phone_number}</span>
                                            </div>
                                        )}
                                    </div>

                                </CardContent>
                                <CardFooter className="p-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-xs text-slate-400">{new Date(ad.created_at).toLocaleDateString()} 등록</span>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 text-xs font-semibold px-2" onClick={() => handleDelete(ad.id, ad.title)} disabled={isUpdating}>
                                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                                        삭제
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
