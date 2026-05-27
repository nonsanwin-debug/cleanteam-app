'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminPhotoFeatureButton } from '@/components/admin/admin-photo-feature-button'
import { AdminPhotoDeleteButton } from '@/components/admin/admin-photo-delete-button'

interface Photo {
    id: string
    site_id: string
    url: string
    type: string
    created_at: string
    is_featured?: boolean
}

interface AdminPhotoViewerProps {
    photos: Photo[]
    siteId: string
}

export function AdminPhotoViewer({ photos, siteId }: AdminPhotoViewerProps) {
    const [selectedZone, setSelectedZone] = useState<string>('all')
    const [selectedStage, setSelectedStage] = useState<string>('all')

    // 1. Extract all unique zones from photos (e.g. '주방', '거실' from '주방_before')
    const zonePhotos = photos.filter(p => p.type && p.type.includes('_'))
    const uniqueZones = Array.from(new Set(zonePhotos.map(p => p.type.split('_')[0])))

    // 2. Classify photos into categories for counting
    const getPhotosByZone = (zone: string) => {
        if (zone === 'all') return photos
        if (zone === 'common') return photos.filter(p => !p.type || !p.type.includes('_'))
        return photos.filter(p => p.type && p.type.startsWith(`${zone}_`))
    }

    // 3. Filter photos based on current selectedZone & selectedStage
    const getFilteredPhotos = () => {
        const zoneFiltered = getPhotosByZone(selectedZone)
        if (selectedStage === 'all') return zoneFiltered

        return zoneFiltered.filter(p => {
            const hasUnderscore = p.type && p.type.includes('_')
            const stage = hasUnderscore ? p.type.split('_').slice(1).join('_') : p.type

            return stage === selectedStage
        })
    }

    const filteredPhotos = getFilteredPhotos()
    const currentFeaturedCount = filteredPhotos.filter(p => p.is_featured).length

    // 4. Calculate stage counts for the currently selected zone
    const currentZonePhotos = getPhotosByZone(selectedZone)
    const getStageCount = (stage: string) => {
        if (stage === 'all') return currentZonePhotos.length
        return currentZonePhotos.filter(p => {
            const hasUnderscore = p.type && p.type.includes('_')
            const s = hasUnderscore ? p.type.split('_').slice(1).join('_') : p.type
            return s === stage
        }).length
    }

    // 5. Define stage configurations
    const stages = [
        { value: 'all', label: '전체' },
        { value: 'before', label: '작업 전' },
        { value: 'during', label: '작업 중' },
        { value: 'after', label: '작업 후' },
        { value: 'special', label: '특이사항' },
    ]

    return (
        <div className="space-y-6">
            {/* Tier 1: 구역/공간 선택 (Zone Selector) */}
            <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                    📍 1단계: 구역(공간) 선택
                </span>
                <div className="flex flex-wrap gap-2 pb-1">
                    {/* 전체 구역 */}
                    <Button
                        type="button"
                        variant={selectedZone === 'all' ? 'default' : 'outline'}
                        size="sm"
                        className={`h-9 px-4 rounded-full font-semibold transition-all ${
                            selectedZone === 'all'
                                ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                        onClick={() => {
                            setSelectedZone('all')
                            setSelectedStage('all') // Reset stage when changing zone for better UX
                        }}
                    >
                        전체 구역
                        <Badge
                            className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                                selectedZone === 'all'
                                    ? 'bg-white text-slate-900 font-bold'
                                    : 'bg-slate-100 text-slate-600 font-medium'
                            }`}
                        >
                            {photos.length}
                        </Badge>
                    </Button>

                    {/* 공통/기타 (지정 없음) */}
                    {photos.some(p => !p.type || !p.type.includes('_')) && (
                        <Button
                            type="button"
                            variant={selectedZone === 'common' ? 'default' : 'outline'}
                            size="sm"
                            className={`h-9 px-4 rounded-full font-semibold transition-all ${
                                selectedZone === 'common'
                                    ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800'
                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                            onClick={() => {
                                setSelectedZone('common')
                                setSelectedStage('all')
                            }}
                        >
                            공통/기타
                            <Badge
                                className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                                    selectedZone === 'common'
                                        ? 'bg-white text-slate-900 font-bold'
                                        : 'bg-slate-100 text-slate-600 font-medium'
                                }`}
                            >
                                {getPhotosByZone('common').length}
                            </Badge>
                        </Button>
                    )}

                    {/* 팀장이 설정한 구역 목록 */}
                    {uniqueZones.map(zone => {
                        const count = getPhotosByZone(zone).length
                        return (
                            <Button
                                key={zone}
                                type="button"
                                variant={selectedZone === zone ? 'default' : 'outline'}
                                size="sm"
                                className={`h-9 px-4 rounded-full font-semibold transition-all ${
                                    selectedZone === zone
                                        ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                                onClick={() => {
                                    setSelectedZone(zone)
                                    setSelectedStage('all')
                                }}
                            >
                                {zone}
                                <Badge
                                    className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                                        selectedZone === zone
                                            ? 'bg-white text-blue-600 font-bold'
                                            : 'bg-slate-100 text-slate-600 font-medium'
                                    }`}
                                >
                                    {count}
                                </Badge>
                            </Button>
                        )
                    })}
                </div>
            </div>

            {/* Tier 2: 작업 단계 선택 (Work Stage Selector) */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    📸 2단계: 작업 단계 선택
                </span>
                <div className="flex flex-wrap gap-1.5">
                    {stages.map(stage => {
                        const count = getStageCount(stage.value)
                        const isActive = selectedStage === stage.value
                        return (
                            <button
                                key={stage.value}
                                type="button"
                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                    isActive
                                        ? 'bg-white text-slate-900 border border-slate-300 shadow-sm font-bold'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                                onClick={() => setSelectedStage(stage.value)}
                            >
                                {stage.label}
                                <span className={`ml-1.5 text-xs ${isActive ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                                    ({count})
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Photos Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPhotos.map((photo) => {
                    // Extract readable stage type for display (e.g. '주방_before' -> '작업 전')
                    let displayType = photo.type
                    if (photo.type) {
                        const hasUnderscore = photo.type.includes('_')
                        const s = hasUnderscore ? photo.type.split('_').slice(1).join('_') : photo.type
                        if (s === 'before') displayType = '작업 전'
                        else if (s === 'during') displayType = '작업 중'
                        else if (s === 'after') displayType = '작업 후'
                        else if (s === 'special') displayType = '특이사항'
                    }

                    return (
                        <div
                            key={photo.id}
                            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-sm hover:shadow transition-shadow"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo.url}
                                alt={photo.type}
                                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Stage Badge */}
                            <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-[2px] text-white text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 z-30 shadow-sm">
                                {displayType}
                            </div>
                            <AdminPhotoFeatureButton
                                photoId={photo.id}
                                isFeatured={!!photo.is_featured}
                                currentFeaturedCount={currentFeaturedCount}
                            />
                            <AdminPhotoDeleteButton photoId={photo.id} photoUrl={photo.url} siteId={siteId} />
                        </div>
                    )
                })}

                {filteredPhotos.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 border border-dashed rounded-2xl">
                        선택된 구역 및 단계에 등록된 사진이 없습니다.
                    </div>
                )}
            </div>
        </div>
    )
}
