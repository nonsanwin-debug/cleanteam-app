/**
 * 글로벌 클라이언트 데이터 캐시 (SWR 패턴)
 * 
 * 페이지 전환 시 캐시된 데이터를 즉시 반환하고,
 * 백그라운드에서 서버 액션을 호출하여 데이터를 갱신합니다.
 * 
 * 사용법:
 *   const { data, loading, refresh } = useCachedData('sites', getAssignedSites)
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// 글로벌 메모리 캐시 (싱글톤)
const cache = new Map<string, { data: any; timestamp: number }>()
const STALE_TIME = 30_000 // 30초 이내면 캐시된 데이터 사용

type CacheOptions = {
    staleTime?: number    // 캐시 유효 시간 (ms)
    onSuccess?: (data: any) => void
}

/**
 * SWR 패턴의 데이터 캐시 훅
 * - 캐시가 있으면 즉시 반환 (로딩 없음!)
 * - 백그라운드에서 서버 데이터 갱신
 * - Realtime 이벤트로 캐시 무효화 가능
 */
export function useCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
): {
    data: T | null
    loading: boolean
    refresh: () => Promise<void>
    invalidate: () => void
} {
    const { staleTime = STALE_TIME, onSuccess } = options
    const cached = cache.get(key)
    const hasFreshCache = cached && (Date.now() - cached.timestamp < staleTime)

    // 캐시가 있으면 즉시 사용 (로딩 X)
    const [data, setData] = useState<T | null>(cached?.data ?? null)
    const [loading, setLoading] = useState(!cached)
    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher

    const fetchData = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true)
        try {
            const result = await fetcherRef.current()
            cache.set(key, { data: result, timestamp: Date.now() })
            setData(result)
            onSuccess?.(result)
        } catch (err) {
            console.error(`[DataCache] ${key} fetch error:`, err)
        } finally {
            setLoading(false)
        }
    }, [key])

    useEffect(() => {
        if (cached) {
            // 캐시가 있으면 → 즉시 보여주고 백그라운드 갱신
            setData(cached.data)
            setLoading(false)
            // fresh 여부와 관계없이 항상 백그라운드 갱신 (삭제 등 변경 즉시 반영)
            if (!hasFreshCache) {
                fetchData(false)
            }
        } else {
            // 캐시 없음 → 로딩 표시하며 가져오기
            fetchData(true)
        }
    }, [key])

    const refresh = useCallback(async () => {
        // Realtime 이벤트 등으로 호출 시 캐시 무효화 후 즉시 갱신
        cache.delete(key)
        await fetchData(false)
    }, [fetchData, key])

    const invalidate = useCallback(() => {
        cache.delete(key)
    }, [key])

    return { data, loading, refresh, invalidate }
}

/**
 * 여러 키의 캐시를 한번에 무효화
 */
export function invalidateCache(...keys: string[]) {
    for (const key of keys) {
        cache.delete(key)
    }
}

/**
 * 모든 캐시 무효화
 */
export function invalidateAllCache() {
    cache.clear()
}
