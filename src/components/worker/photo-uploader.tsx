/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef, useEffect, TouchEvent } from 'react'
import { deletePhoto } from '@/actions/worker'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Camera, Upload, Loader2, X, ZoomIn, ChevronLeft, ChevronRight, Trash2, Download, Star, Sparkles, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { togglePhotoFeatured } from '@/actions/admin'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { uploadManager } from '@/lib/upload-manager'

// 기존 고정 타입들
const LEGACY_TYPES = ['before', 'during', 'after', 'special'] as const
const PHASE_OPTIONS = [
    { value: 'before', label: '작업 전', color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'during', label: '작업 중', color: 'bg-orange-500', lightColor: 'bg-orange-50 text-orange-700 border-orange-200' },
    { value: 'after', label: '작업 후', color: 'bg-green-500', lightColor: 'bg-green-50 text-green-700 border-green-200' },
] as const

interface PhotoUploaderProps {
    siteId: string
    existingPhotos: any[]
    readOnly?: boolean
    canDelete?: boolean
    showFeatureToggle?: boolean
    photoZones?: string[] // 공간별 구역 목록 (예: ["방1", "방2", "화1", "베1"])
}

export function PhotoUploader({ siteId, existingPhotos, readOnly = false, canDelete = false, showFeatureToggle = false, photoZones }: PhotoUploaderProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    
    // 공간별 모드 여부
    const isZoneMode = photoZones && photoZones.length > 0

    // 기존 모드: before/during/after/special 탭
    const [legacyTab, setLegacyTab] = useState<'before' | 'during' | 'after' | 'special'>('before')
    
    // 공간별 모드: 선택된 구역 + 단계
    const [selectedZone, setSelectedZone] = useState<string>(photoZones?.[0] || '')
    const [selectedPhase, setSelectedPhase] = useState<'before' | 'during' | 'after'>('before')
    
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const zoneScrollRef = useRef<HTMLDivElement>(null)

    const minSwipeDistance = 50

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEndEvent = () => {
        if (!touchStart || !touchEnd) return
        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        if (isLeftSwipe) handleNext()
        else if (isRightSwipe) handlePrev()
    }

    useEffect(() => {
        if (selectedPhotoIndex !== null) {
            window.history.pushState({ modalOpen: true }, '', '')
            const handlePopState = () => setSelectedPhotoIndex(null)
            window.addEventListener('popstate', handlePopState)
            return () => window.removeEventListener('popstate', handlePopState)
        }
    }, [selectedPhotoIndex])

    const handleManualClose = (open: boolean) => {
        if (!open && selectedPhotoIndex !== null) window.history.back()
    }

    // 현재 표시할 사진 필터링
    const currentPhotos = (() => {
        if (isZoneMode) {
            const typePrefix = `${selectedZone}_${selectedPhase}`
            return existingPhotos.filter(p => p.type === typePrefix)
        }
        return existingPhotos.filter(p => p.type === legacyTab)
    })()

    // 현재 업로드 type 결정
    const currentUploadType = isZoneMode
        ? `${selectedZone}_${selectedPhase}`
        : legacyTab

    // 기존 사진 중 zone 모드에서 legacy 타입인 것들
    const legacyPhotos = isZoneMode
        ? existingPhotos.filter(p => LEGACY_TYPES.includes(p.type))
        : []

    // 각 구역별 사진 수
    const getZonePhotoCount = (zone: string) => {
        return existingPhotos.filter(p => p.type.startsWith(`${zone}_`)).length
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (readOnly) return
        const files = event.target.files
        if (!files || files.length === 0) return

        const fileArray = Array.from(files)
        uploadManager.addFiles(fileArray, siteId, currentUploadType)
        toast.success(`${fileArray.length}장의 사진 업로드를 시작합니다.`, {
            description: '다른 화면으로 이동해도 업로드가 계속됩니다.'
        })

        if (fileInputRef.current) fileInputRef.current.value = ''
        if (cameraInputRef.current) cameraInputRef.current.value = ''
    }

    async function handleToggleFeature(photo: any) {
        if (!showFeatureToggle) return
        if (!photo.is_featured) {
            const featuredCount = currentPhotos.filter(p => p.is_featured).length
            if (featuredCount >= 4) {
                toast.error('대표 사진은 각 탭별로 최대 4장까지만 설정할 수 있습니다.')
                return
            }
        }

        try {
            const result = await togglePhotoFeatured(photo.id, !photo.is_featured)
            if (!result.success) throw new Error(result.error)
            toast.success(photo.is_featured ? '대표 사진에서 해제되었습니다.' : '대표 사진으로 설정되었습니다.')
            router.refresh()
        } catch (error: any) {
            toast.error('설정 실패', { description: error.message })
        }
    }

    async function handleDelete(photo: any) {
        if (readOnly) return
        if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) return

        setIsDeleting(true)
        try {
            const result = await deletePhoto(photo.id, photo.url, siteId)
            if (!result.success) throw new Error(result.error)
            toast.success('사진이 삭제되었습니다.')
            window.history.back()
            router.refresh()
        } catch (error) {
            toast.error('삭제 실패', { description: (error as Error).message })
        } finally {
            setIsDeleting(false)
        }
    }

    async function handleDownloadAll() {
        if (currentPhotos.length === 0) {
            toast.error('다운로드할 사진이 없습니다.')
            return
        }

        const ua = window.navigator.userAgent.toLowerCase()
        const isKakao = ua.includes('kakaotalk')
        const isIOS = /ipad|iphone|ipod/.test(ua)

        if (isKakao) {
            alert('카카오톡 브라우저에서는 압축 파일 다운로드가 지원되지 않을 수 있습니다.\n\n다운로드가 되지 않는다면, 화면 우측 하단의 [⋮] 버튼을 눌러 "다른 브라우저로 열기" (Safari 또는 Chrome)를 선택하여 다시 시도해주세요.')
        }

        setIsDownloading(true)
        try {
            const zip = new JSZip()
            const folderName = isZoneMode ? `${selectedZone}_${selectedPhase}` : legacyTab
            const folder = zip.folder(folderName)

            let downloadedCount = 0
            const promises = currentPhotos.map(async (photo, index) => {
                try {
                    const response = await fetch(photo.url)
                    if (!response.ok) throw new Error('Fetch failed')
                    const blob = await response.blob()
                    let extension = 'jpg'
                    if (blob.type === 'image/png') extension = 'png'
                    const filename = `${folderName}_${index + 1}.${extension}`
                    folder?.file(filename, blob)
                    downloadedCount++
                } catch (e) {
                    console.error('Download failed for', photo.url, e)
                }
            })

            await Promise.all(promises)
            if (downloadedCount === 0) throw new Error('사진을 다운로드할 수 없습니다.')

            const content = await zip.generateAsync({ type: 'blob' })
            saveAs(content, `NEXUS_현장사진_${folderName}.zip`)
            
            const addMsg = isIOS ? '아이폰은 사진첩이 아닌 [파일] 앱에 저장됩니다.' : '스마트폰 [다운로드] 폴더를 확인해주세요.'
            toast.success(`${downloadedCount}장의 사진을 다운로드했습니다.`, { description: addMsg, duration: 6000 })

            if (isIOS && !isKakao) {
                toast.info('아이폰은 [파일] 앱에 저장됩니다.', {
                    description: '홈 화면에서 [파일] 앱(폴더 모양)을 열어 다운로드 항목을 확인하세요.',
                    duration: 6000
                })
            }
        } catch (error) {
            console.error('Download all error:', error)
            toast.error('다운로드 실패', { description: (error as Error).message })
        } finally {
            setIsDownloading(false)
        }
    }

    function handlePrev() {
        if (selectedPhotoIndex === null) return
        setSelectedPhotoIndex(prev => (prev !== null && prev > 0 ? prev - 1 : currentPhotos.length - 1))
    }

    function handleNext() {
        if (selectedPhotoIndex === null) return
        setSelectedPhotoIndex(prev => (prev !== null && prev < currentPhotos.length - 1 ? prev + 1 : 0))
    }

    return (
        <div className="space-y-4">
            {/* ===== 공간별 모드 ===== */}
            {isZoneMode ? (
                <div className="space-y-3">
                    {/* 공간 탭 (가로 스크롤) */}
                    <div className="relative">
                        <div
                            ref={zoneScrollRef}
                            className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {photoZones.map(zone => {
                                const count = getZonePhotoCount(zone)
                                const isActive = selectedZone === zone
                                return (
                                    <button
                                        key={zone}
                                        onClick={() => { setSelectedZone(zone); setSelectedPhotoIndex(null) }}
                                        className={`
                                            relative shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                                            ${isActive
                                                ? 'bg-slate-800 text-white shadow-md scale-105'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }
                                        `}
                                    >
                                        {zone}
                                        {count > 0 && (
                                            <span className={`
                                                ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1
                                                ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}
                                            `}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 작업 단계 선택 (전/중/후) */}
                    <div className="flex gap-2">
                        {PHASE_OPTIONS.map(phase => {
                            const typeKey = `${selectedZone}_${phase.value}`
                            const count = existingPhotos.filter(p => p.type === typeKey).length
                            const isActive = selectedPhase === phase.value
                            return (
                                <button
                                    key={phase.value}
                                    onClick={() => { setSelectedPhase(phase.value); setSelectedPhotoIndex(null) }}
                                    className={`
                                        flex-1 py-2 rounded-lg text-sm font-bold transition-all border
                                        ${isActive
                                            ? `${phase.lightColor} border-current shadow-sm`
                                            : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                                        }
                                    `}
                                >
                                    {phase.label}
                                    {count > 0 && (
                                        <span className="ml-1 text-[10px] opacity-70">({count})</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* 기존 사진 알림 (legacy photos) */}
                    {legacyPhotos.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-xs text-amber-700">
                            <span className="font-bold">💡 참고:</span> 기존 방식으로 촬영된 사진 {legacyPhotos.length}장이 있습니다.
                        </div>
                    )}
                </div>
            ) : (
                /* ===== 기존 모드 (before/during/after/special) ===== */
                <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg mb-4">
                    {[
                        { value: 'before' as const, label: '작업 전' },
                        { value: 'during' as const, label: '작업 중' },
                        { value: 'after' as const, label: '작업 후' },
                        { value: 'special' as const, label: '특이사항' },
                    ].map(t => (
                        <button
                            key={t.value}
                            onClick={() => { setLegacyTab(t.value); setSelectedPhotoIndex(null) }}
                            className={`
                                py-2 rounded-md text-xs font-bold transition-all
                                ${legacyTab === t.value
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }
                            `}
                        >
                            {t.label}
                            {existingPhotos.filter(p => p.type === t.value).length > 0 && (
                                <span className="ml-1 text-[10px] opacity-60">
                                    ({existingPhotos.filter(p => p.type === t.value).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* ===== 업로드 버튼 ===== */}
            {!readOnly && (
                <div className="space-y-2">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={cameraInputRef}
                        onChange={handleFileChange}
                    />

                    <div className="flex gap-2">
                        {/* 카메라 직접 촬영 버튼 */}
                        <Button
                            variant="outline"
                            className="flex-1 h-14 flex items-center justify-center gap-2 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                            onClick={() => cameraInputRef.current?.click()}
                        >
                            <Camera className="h-5 w-5" />
                            <span className="font-bold text-sm">📷 사진 찍기</span>
                        </Button>

                        {/* 갤러리 선택 버튼 */}
                        <Button
                            variant="outline"
                            className="flex-1 h-14 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:bg-slate-50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImagePlus className="h-5 w-5 text-slate-500" />
                            <span className="font-medium text-sm text-slate-600">갤러리에서 선택</span>
                        </Button>
                    </div>

                    {/* 현재 업로드 대상 표시 */}
                    {isZoneMode && (
                        <div className="text-center text-xs text-slate-400 font-medium">
                            📌 현재 촬영 대상: <span className="text-slate-700 font-bold">{selectedZone}</span> · <span className="text-slate-600">{PHASE_OPTIONS.find(p => p.value === selectedPhase)?.label}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ===== 사진 그리드 ===== */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {currentPhotos.length === 0 ? (
                    <div className="col-span-3 lg:col-span-5 py-16 mt-4 text-center text-slate-500 bg-slate-50/80 border border-slate-200 border-dashed rounded-xl text-sm flex flex-col items-center justify-center shadow-sm">
                        <div className="p-4 bg-blue-100/50 text-blue-500 rounded-full mb-4">
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <span className="font-bold text-slate-700 text-base mb-1">사진을 준비 중입니다</span>
                        <span className="text-slate-500">꼼꼼하게 청소하고 있어요. 잠시만 기다려 주세요!</span>
                    </div>
                ) : (
                    currentPhotos.map((photo, index) => (
                        <div
                            key={photo.id}
                            className="relative aspect-square rounded-lg overflow-hidden border bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity group"
                            onClick={() => setSelectedPhotoIndex(index)}
                        >
                            {showFeatureToggle && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleFeature(photo); }}
                                    className={`absolute top-2 left-2 z-20 p-1.5 rounded-full shadow-sm transition-colors ${photo.is_featured ? 'bg-yellow-400 text-white' : 'bg-black/40 text-white/70 hover:bg-black/60'}`}
                                    title={photo.is_featured ? "포트폴리오 대표 사진 해제" : "포트폴리오 대표 사진으로 설정 (최대 4장)"}
                                >
                                    <Star className={`w-4 h-4 ${photo.is_featured ? 'fill-current text-white outline-none' : ''}`} />
                                </button>
                            )}
                            <img
                                src={photo.url}
                                alt="Work photo"
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-6 h-6" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ===== 사진 상세 모달 ===== */}
            <Dialog open={selectedPhotoIndex !== null} onOpenChange={handleManualClose}>
                <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none shadow-none focus:outline-none flex items-center justify-center h-[90vh]" aria-describedby="photo-description">
                    <div id="photo-title" className="sr-only">사진 상세 보기</div>
                    <div id="photo-description" className="sr-only">선택된 사진의 상세 보기 화면입니다.</div>
                    {selectedPhotoIndex !== null && currentPhotos[selectedPhotoIndex] && (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                            {/* Navigation Buttons */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-50 text-white bg-black/30 hover:bg-black/50 rounded-full h-10 w-10 md:h-12 md:w-12"
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            >
                                <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 z-50 text-white bg-black/30 hover:bg-black/50 rounded-full h-10 w-10 md:h-12 md:w-12"
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            >
                                <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
                            </Button>

                            {/* Close Button */}
                            <Button
                                variant="secondary"
                                className="absolute top-4 left-4 z-50 rounded-full shadow-lg bg-white/90 hover:bg-white text-slate-800 flex items-center gap-1.5 px-3"
                                onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }}
                            >
                                <X className="h-4 w-4" />
                                <span className="text-sm font-bold">닫기</span>
                            </Button>

                            {/* Action Buttons */}
                            <div className="absolute top-4 right-4 z-50 flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="rounded-full shadow-lg bg-white/90 hover:bg-white flex items-center gap-2 pr-4 pl-3"
                                    onClick={(e) => { e.stopPropagation(); handleDownloadAll(); }}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin text-slate-700" /> : <Download className="h-4 w-4 text-slate-700" />}
                                    <span className="text-sm font-bold text-slate-800">
                                        ({currentPhotos.length}) 묶음 다운로드
                                    </span>
                                </Button>

                                {canDelete && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="rounded-full shadow-lg"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(currentPhotos[selectedPhotoIndex]); }}
                                        disabled={isDeleting}
                                        title="현재 사진 삭제"
                                    >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                )}
                            </div>

                            <div
                                className="relative w-full h-full bg-black/80 rounded-lg overflow-hidden flex items-center justify-center"
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEndEvent}
                            >
                                <img
                                    src={currentPhotos[selectedPhotoIndex].url}
                                    alt="Enlarged photo"
                                    className="object-contain w-full h-full"
                                />
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full">
                                    {selectedPhotoIndex + 1} / {currentPhotos.length}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
