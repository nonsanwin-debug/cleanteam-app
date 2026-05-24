/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef, useEffect, TouchEvent } from 'react'
import { deletePhoto, updatePhotoZones } from '@/actions/worker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Camera, X, ZoomIn, ChevronLeft, ChevronRight, Trash2, Download, Star, Sparkles, ImagePlus, Plus, Settings2, Loader2 } from 'lucide-react'
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
    photoZones?: string[]
}

export function PhotoUploader({ siteId, existingPhotos, readOnly = false, canDelete = false, showFeatureToggle = false, photoZones: initialPhotoZones }: PhotoUploaderProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    
    // 공간별 구역 관리 (팀장이 편집 가능)
    const [photoZones, setPhotoZones] = useState<string[]>(initialPhotoZones || [])
    const [showZoneEditor, setShowZoneEditor] = useState(false)
    const [zoneInput, setZoneInput] = useState('')
    const [isSavingZones, setIsSavingZones] = useState(false)
    
    // props가 바뀌면 sync
    useEffect(() => {
        if (initialPhotoZones) setPhotoZones(initialPhotoZones)
    }, [initialPhotoZones])

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

    // 인앱 실시간 연속 카메라 촬영 상태
    const [showInAppCamera, setShowInAppCamera] = useState(false)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [sessionPhotos, setSessionPhotos] = useState<Array<{ id: string; url: string; status: 'uploading' | 'done' | 'failed' }>>([])
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [isFlashActive, setIsFlashActive] = useState(false)
    
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // 카메라 시작 (연속 촬영용 WebRTC)
    const startInAppCamera = async () => {
        setCameraError(null)
        setShowInAppCamera(true)
        setSessionPhotos([])

        try {
            // 후면 카메라 우선 및 고해상도 매칭 시도
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            }
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream
            setCameraStream(stream)
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
        } catch (err: any) {
            console.error('Failed to get camera with environment facingMode, trying fallback:', err)
            try {
                // 일반 카메라 권한 시도
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                streamRef.current = stream
                setCameraStream(stream)
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            } catch (fallbackErr: any) {
                console.error('Camera fallback failed:', fallbackErr)
                setCameraError('카메라를 열 수 없습니다. 카메라 권한 설정을 허용해 주시거나 아래 [기본 카메라 사용]을 클릭해 주세요.')
            }
        }
    }

    // 카메라 중지 및 스트림 정리
    const stopInAppCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setCameraStream(null)
        setShowInAppCamera(false)
        setSessionPhotos([])
    }

    // 사진 프레임 캡처 및 백그라운드 업로드 시작
    const capturePhoto = () => {
        if (!videoRef.current || !cameraStream) return

        setIsFlashActive(true)
        setTimeout(() => setIsFlashActive(false), 120)

        const video = videoRef.current
        const canvas = document.createElement('canvas')
        
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            
            canvas.toBlob((blob) => {
                if (!blob) return
                
                const photoId = Math.random().toString(36).substring(2, 10)
                const filename = `shot_${photoId}.jpg`
                const file = new File([blob], filename, { type: 'image/jpeg' })
                
                const localUrl = URL.createObjectURL(blob)
                
                setSessionPhotos(prev => [
                    ...prev,
                    { id: photoId, url: localUrl, status: 'uploading' }
                ])
                
                uploadManager.addFiles([file], siteId, currentUploadType)
            }, 'image/jpeg', 0.85)
        }
    }

    // 연속 카메라용 실시간 업로드 상태 연동
    useEffect(() => {
        if (!showInAppCamera || sessionPhotos.length === 0) return

        const updateStatus = () => {
            const activeBatches = uploadManager.getAllBatches()
            const allItems = activeBatches.flatMap(b => b.items)

            setSessionPhotos(prev => prev.map(p => {
                const targetFilename = `shot_${p.id}.jpg`
                const match = allItems.find(item => item.fileName.endsWith(targetFilename))
                if (match) {
                    let status: 'uploading' | 'done' | 'failed' = 'uploading'
                    if (match.status === 'done') status = 'done'
                    if (match.status === 'failed') status = 'failed'
                    return { ...p, status }
                }
                return p
            }))
        }

        const unsubscribe = uploadManager.subscribe(updateStatus)
        return () => unsubscribe()
    }, [showInAppCamera, sessionPhotos.length])

    // 모달이 변경될 때 video 태그 srcObject 갱신 보장
    useEffect(() => {
        if (showInAppCamera && cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream
        }
    }, [showInAppCamera, cameraStream])

    // 컴포넌트 언마운트 시 카메라 끄기
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

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

    // selectedZone이 없으면 첫번째로 설정
    useEffect(() => {
        if (isZoneMode && !selectedZone && photoZones.length > 0) {
            setSelectedZone(photoZones[0])
        }
    }, [photoZones, isZoneMode, selectedZone])

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

    // ===== 구역 관리 함수들 =====
    const handleAddZone = (zoneName: string) => {
        if (!zoneName.trim()) return
        if (photoZones.includes(zoneName.trim())) {
            toast.error('이미 존재하는 구역입니다.')
            return
        }
        setPhotoZones(prev => [...prev, zoneName.trim()])
        setZoneInput('')
    }

    const handleRemoveZone = (idx: number) => {
        setPhotoZones(prev => {
            const newZones = [...prev]
            newZones.splice(idx, 1)
            return newZones
        })
    }

    const handleAutoGenerateZones = (structureText: string) => {
        if (!structureText.trim()) return
        const zones: string[] = []
        const parts = structureText.replace(/,/g, ' ').split(/\s+/)
        for (const part of parts) {
            const match = part.match(/^(.+?)(\d+)$/)
            if (match) {
                const [, prefix, countStr] = match
                const count = parseInt(countStr, 10)
                for (let i = 1; i <= count; i++) {
                    zones.push(`${prefix}${i}`)
                }
            }
        }
        if (zones.length === 0) {
            toast.error('형식을 확인해주세요. 예: 방3 화2 베1')
            return
        }
        setPhotoZones(zones)
        toast.success(`${zones.length}개 구역이 생성되었습니다.`)
    }

    const handleSaveZones = async () => {
        setIsSavingZones(true)
        try {
            const result = await updatePhotoZones(siteId, photoZones)
            if (!result.success) throw new Error(result.error)
            toast.success('구역 설정이 저장되었습니다.')
            setShowZoneEditor(false)
            if (photoZones.length > 0 && !selectedZone) {
                setSelectedZone(photoZones[0])
            }
            router.refresh()
        } catch (err: any) {
            toast.error('저장 실패', { description: err.message })
        } finally {
            setIsSavingZones(false)
        }
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
            {/* ===== 구역 설정 안내 + 편집 (팀장용) ===== */}
            {!readOnly && (
                <>
                    {/* 구역 미설정 시 안내 카드 */}
                    {!isZoneMode && !showZoneEditor && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-500 text-white p-2 rounded-lg shrink-0">
                                    <Settings2 className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 text-sm">📸 공간별 사진 구역을 설정하세요</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        구역을 설정하면 <strong>방1, 화1, 베1</strong> 등 공간별로 작업 전/중/후 사진을 분류하여 촬영할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="default"
                                size="sm"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                onClick={() => setShowZoneEditor(true)}
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                구역 설정하기
                            </Button>
                        </div>
                    )}

                    {/* 구역 편집 패널 */}
                    {showZoneEditor && (
                        <div className="bg-white border-2 border-blue-300 rounded-xl p-4 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-blue-600" />
                                    사진 구역 설정
                                </h4>
                                <button onClick={() => setShowZoneEditor(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* 빠른 생성: 구조 입력 */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600">빠른 생성</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="예: 방3 화2 베1 (방3개, 화장실2개, 베란다1개)"
                                        className="flex-1 h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAutoGenerateZones((e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = ''
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-10 text-xs shrink-0"
                                        onClick={(e) => {
                                            const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement
                                            if (input?.value) {
                                                handleAutoGenerateZones(input.value)
                                                input.value = ''
                                            }
                                        }}
                                    >
                                        자동 생성
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    &quot;방3 화2 베1&quot; 입력 시 → 방1, 방2, 방3, 화1, 화2, 베1 자동 생성
                                </p>
                            </div>

                            {/* 현재 구역 태그 */}
                            {photoZones.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-600">현재 구역 ({photoZones.length}개)</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {photoZones.map((zone, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                                            >
                                                {zone}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveZone(idx)}
                                                    className="hover:text-red-600 ml-0.5"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 수동 추가 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600">수동 추가</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="구역명 입력 (예: 거실, 주방)"
                                        value={zoneInput}
                                        onChange={(e) => setZoneInput(e.target.value)}
                                        className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                handleAddZone(zoneInput)
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-9 text-xs"
                                        onClick={() => handleAddZone(zoneInput)}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> 추가
                                    </Button>
                                </div>
                            </div>

                            {/* 저장 버튼 */}
                            <Button
                                onClick={handleSaveZones}
                                disabled={isSavingZones}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {isSavingZones ? (
                                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> 저장 중...</>
                                ) : (
                                    <>✅ 구역 설정 저장 ({photoZones.length}개)</>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* 구역 편집 버튼 (이미 설정된 경우) */}
                    {isZoneMode && !showZoneEditor && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowZoneEditor(true)}
                                className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                구역 수정
                            </button>
                        </div>
                    )}
                </>
            )}

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
                            className="flex-1 h-14 flex items-center justify-center gap-2 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 shadow-sm transition-all"
                            onClick={startInAppCamera}
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

            {/* ===== 인앱 연속 카메라 모달 ===== */}
            {showInAppCamera && (
                <div className="fixed inset-0 z-[150] bg-black flex flex-col justify-between select-none touch-none text-white">
                    {/* 상단 툴바 */}
                    <div className="bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center justify-between z-10 border-b border-white/5">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NEXUS MULTI-CAMERA</span>
                            {isZoneMode ? (
                                <span className="text-xs font-bold text-blue-400">
                                    📌 {selectedZone} · {PHASE_OPTIONS.find(p => p.value === selectedPhase)?.label} 촬영 중
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-blue-400">
                                    📌 {legacyTab === 'before' ? '작업 전' : legacyTab === 'during' ? '작업 중' : legacyTab === 'after' ? '작업 후' : '특이사항'} 촬영 중
                                </span>
                            )}
                        </div>
                        <button
                            onClick={stopInAppCamera}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 active:scale-90 transition-transform"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* 실시간 프리뷰 영역 */}
                    <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                        {cameraError ? (
                            <div className="p-6 text-center space-y-4 max-w-xs">
                                <span className="text-3xl">⚠️</span>
                                <p className="text-sm text-slate-300 leading-relaxed">{cameraError}</p>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        stopInAppCamera()
                                        cameraInputRef.current?.click()
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white border-0 font-bold w-full py-2.5 rounded-lg"
                                >
                                    기본 카메라 사용하기
                                </Button>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                {/* 플래시 오버레이 */}
                                <div
                                    className={`absolute inset-0 bg-white transition-opacity duration-150 pointer-events-none ${
                                        isFlashActive ? 'opacity-85' : 'opacity-0'
                                    }`}
                                />
                            </>
                        )}
                    </div>

                    {/* 하단 제어 & 썸네일 영역 */}
                    <div className="bg-slate-950 px-4 py-6 pb-8 flex flex-col gap-4 z-10 border-t border-white/5">
                        {/* 실시간 업로드 썸네일 스트립 */}
                        {sessionPhotos.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto py-1.5 min-h-[70px] max-h-[85px] [&::-webkit-scrollbar]:hidden">
                                {sessionPhotos.map((photo) => (
                                    <div key={photo.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/10 shrink-0 shadow-lg">
                                        <img src={photo.url} className="w-full h-full object-cover" alt="Captured" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            {photo.status === 'uploading' && (
                                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                            )}
                                            {photo.status === 'done' && (
                                                <span className="text-green-400 font-bold text-xs">✓</span>
                                            )}
                                            {photo.status === 'failed' && (
                                                <span className="text-red-400 font-bold text-xs">✗</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 메인 컨트롤러 */}
                        <div className="flex items-center justify-between px-6">
                            {/* 왼쪽: 기본 카메라 사용 (포커스 우회) */}
                            <button
                                onClick={() => {
                                    stopInAppCamera()
                                    setTimeout(() => cameraInputRef.current?.click(), 100)
                                }}
                                className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
                            >
                                <div className="bg-white/5 p-2.5 rounded-full">
                                    <Settings2 className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-bold">기본 카메라</span>
                            </button>

                            {/* 가운데: 셔터 버튼 */}
                            <button
                                onClick={capturePhoto}
                                disabled={!!cameraError || !cameraStream}
                                className="relative flex items-center justify-center w-20 h-20 bg-transparent rounded-full border-4 border-white p-1 select-none active:scale-95 transition-transform shrink-0 disabled:opacity-55"
                            >
                                <div className="w-full h-full bg-white rounded-full transition-colors hover:bg-slate-200" />
                            </button>

                            {/* 오른쪽: 완료 버튼 */}
                            <button
                                onClick={stopInAppCamera}
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-full px-5 py-3 shadow-md transition-all shrink-0"
                            >
                                촬영 완료
                            </button>
                        </div>
                    </div>
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

                            <Button
                                variant="secondary"
                                className="absolute top-4 left-4 z-50 rounded-full shadow-lg bg-white/90 hover:bg-white text-slate-800 flex items-center gap-1.5 px-3"
                                onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }}
                            >
                                <X className="h-4 w-4" />
                                <span className="text-sm font-bold">닫기</span>
                            </Button>

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
