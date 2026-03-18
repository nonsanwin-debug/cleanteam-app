'use client'

import { useEffect, useState, useRef } from 'react'
import { getActiveAds } from '@/actions/ads'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'

export function AdBanner({ placement }: { placement: string }) {
    const [ads, setAds] = useState<any[]>([])
    const [currentAdIndex, setCurrentAdIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const trackedRef = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        async function fetchAds() {
            setLoading(true)
            const result = await getActiveAds(placement)
            if (result.success && result.data && result.data.length > 0) {
                // Filter out ads that have reached their max_impressions
                const validAds = result.data.filter((ad: any) => ad.impressions_count < ad.max_impressions)
                setAds(validAds)
                // Randomly pick a starting ad
                if (validAds.length > 0) {
                    setCurrentAdIndex(Math.floor(Math.random() * validAds.length))
                }
            }
            setLoading(false)
        }
        fetchAds()
    }, [placement])

    const currentAd = ads[currentAdIndex]

    // Impression tracking loop using IntersectionObserver
    useEffect(() => {
        if (!currentAd || trackedRef.current || !containerRef.current) return

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                if (entry.isIntersecting) {
                    trackedRef.current = true // Prevent firing multiple times per render
                    
                    // Increment impression atomically via RPC
                    supabase.rpc('increment_ad_impression', { ad_id: currentAd.id })
                        .then(({ error }) => {
                            if (error) console.error('Failed to log impression:', error)
                        })
                    
                    observer.disconnect()
                }
            },
            { threshold: 0.5 } // Require at least 50% visibility
        )

        observer.observe(containerRef.current)

        return () => {
            observer.disconnect()
        }
    }, [currentAd, supabase])

    const handleAdClick = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!currentAd) return

        // Increment click atomically via RPC
        try {
            await supabase.rpc('increment_ad_click', { ad_id: currentAd.id })
        } catch (error) {
            console.error('Failed to log click:', error)
        }

        // Navigate based on priority: Link > Phone
        if (currentAd.link_url) {
            window.open(currentAd.link_url, '_blank', 'noopener,noreferrer')
        } else if (currentAd.phone_number) {
            window.location.href = `tel:${currentAd.phone_number}`
        }
    }

    if (loading) {
        return <div className="w-full h-16 bg-slate-100 rounded-lg animate-pulse mb-6"></div>
    }

    if (!ads || ads.length === 0 || !currentAd) {
        return null // No active ads, don't show anything
    }

    return (
        <div className="flex justify-center w-full mb-6 relative z-0">
            <div 
                ref={containerRef}
                className="relative rounded-md overflow-hidden shadow-sm cursor-pointer group bg-white border border-slate-200 w-full"
                onClick={handleAdClick}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                    src={currentAd.image_url} 
                    alt={currentAd.title} 
                    className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
                />
                {/* Optional Ad Badge */}
                <div className="absolute top-1 right-1 bg-black/40 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-sm shadow-sm z-10 pointer-events-none">
                    AD
                </div>
            </div>
        </div>
    )
}
