'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export function PhotoGrid({ photos, title }: { photos: string[], title: string }) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

    if (!photos || photos.length === 0) return null

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev))
    }

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
    }

    return (
        <>
            <div className="mt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-2 border-l-2 border-blue-500 pl-2">
                    {title}
                </h4>
                <div className={`grid gap-2 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {photos.map((url, i) => (
                        <div
                            key={i}
                            onClick={() => setSelectedIndex(i)}
                            className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 shadow-sm border border-slate-200 cursor-pointer"
                        >
                            <img
                                src={url}
                                alt={`${title} 사진 ${i + 1}`}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {selectedIndex !== null && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col touch-none">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 text-white">
                        <button
                            onClick={() => setSelectedIndex(null)}
                            className="p-2 flex items-center gap-1 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span>뒤로가기</span>
                        </button>
                        <span className="text-sm font-medium text-slate-300">
                            {selectedIndex + 1} / {photos.length}
                        </span>
                        <button
                            onClick={() => setSelectedIndex(null)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Image Viewer */}
                    <div className="flex-1 relative flex items-center justify-center p-4" onClick={() => setSelectedIndex(null)}>
                        {selectedIndex > 0 && (
                            <button
                                onClick={handlePrev}
                                className="absolute left-2 p-2 text-white/50 hover:text-white transition-colors z-10"
                            >
                                <ChevronLeft className="w-10 h-10" />
                            </button>
                        )}

                        <img
                            src={photos[selectedIndex]}
                            alt={`${title} 확대 사진`}
                            className="max-w-full max-h-full object-contain select-none shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {selectedIndex < photos.length - 1 && (
                            <button
                                onClick={handleNext}
                                className="absolute right-2 p-2 text-white/50 hover:text-white transition-colors z-10"
                            >
                                <ChevronRight className="w-10 h-10" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
