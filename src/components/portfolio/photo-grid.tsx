'use client'

import { useState, TouchEvent, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Sparkles, Camera } from 'lucide-react'

export function PhotoGrid({ photos, title }: { photos: string[], title: string }) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const handlePopState = () => {
            if (selectedIndex !== null) {
                setSelectedIndex(null)
            }
        }
        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [selectedIndex])

    useEffect(() => {
        if (selectedIndex !== null) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [selectedIndex])

    const openModal = (index: number) => {
        setSelectedIndex(index)
        window.history.pushState({ imageModalOpen: true }, '')
    }

    const closeModal = () => {
        setSelectedIndex(null)
        if (window.history.state?.imageModalOpen) {
            window.history.back()
        }
    }

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null) // Reset touch end
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

        if (isLeftSwipe) {
            // Swipe Left -> Next Photo
            setSelectedIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev))
        } else if (isRightSwipe) {
            // Swipe Right -> Prev Photo
            setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
        }
    }

    if (!photos || photos.length === 0) return null

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev))
    }

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
    }

    const modalContent = selectedIndex !== null ? (
        <div className="fixed top-0 left-0 w-[100vw] h-[100dvh] z-[99999] bg-black/95 flex flex-col touch-none overflow-hidden m-0 p-0 overscroll-none">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white shrink-0">
                <button
                    onClick={closeModal}
                    className="p-2 flex items-center gap-1 text-sm font-medium hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
                >
                    <ChevronLeft className="w-6 h-6" />
                    <span className="text-base font-bold">뒤로가기</span>
                </button>
                <span className="text-base font-bold text-slate-300">
                    {selectedIndex + 1} / {photos.length}
                </span>
                <button
                    onClick={closeModal}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
                >
                    <X className="w-7 h-7" />
                </button>
            </div>

            {/* Image Viewer */}
            <div
                className="flex-1 relative flex items-center justify-center p-4 overflow-hidden touch-none"
                onClick={closeModal}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEndEvent}
            >
                {selectedIndex > 0 && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition-colors z-[1000] rounded-full bg-black/20 focus:outline-none"
                    >
                        <ChevronLeft className="w-8 h-8 md:w-12 md:h-12" />
                    </button>
                )}

                <img
                    src={photos[selectedIndex]}
                    alt={`${title} 확대 사진`}
                    className="max-w-full max-h-full object-contain select-none shadow-2xl transition-transform"
                    onClick={(e) => e.stopPropagation()}
                />

                {selectedIndex < photos.length - 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition-colors z-[1000] rounded-full bg-black/20 focus:outline-none"
                    >
                        <ChevronRight className="w-8 h-8 md:w-12 md:h-12" />
                    </button>
                )}
            </div>
        </div>
    ) : null

    return (
        <>
            <div className="mt-4">
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3 border-l-2 border-blue-500 pl-2">
                    {title.includes('후') ? (
                        <Sparkles className="w-4 h-4 text-blue-500" />
                    ) : (
                        <Camera className="w-4 h-4 text-slate-400" />
                    )}
                    {title}
                </h4>
                <div className={`grid gap-2 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {photos.map((url, i) => (
                        <div
                            key={i}
                            onClick={() => openModal(i)}
                            className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 shadow-sm border border-slate-200 cursor-pointer group"
                        >
                            <img
                                src={url}
                                alt={`${title} 사진 ${i + 1}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {mounted && modalContent ? createPortal(modalContent, document.body) : null}
        </>
    )
}
