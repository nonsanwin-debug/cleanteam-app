const CACHE_NAME = 'cleanteam-v3'

const PRECACHE_URLS = [
    '/',
]

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS)
        })
    )
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        })
    )
    self.clients.claim()
})

self.addEventListener('fetch', (event) => {
    // API calls and non-GET requests are ignore
    if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
        return
    }

    // DO NOT intercept Next.js Data requests (RSC), prefetches, or internal _next files
    // The naive cache can break App Router soft-navigation
    if (
        event.request.headers.get('RSC') === '1' ||
        event.request.headers.get('Next-Router-Prefetch') === '1' ||
        event.request.url.includes('/_next/')
    ) {
        return
    }

    // ALWAYS network-first for HTML navigations to avoid serving old cached pages or RSC payloads by mistake
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request) // fallback to cache only if completely offline
            })
        )
        return
    }

    // Standard stale-while-revalidate or network-first for assets like images, fonts
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const responseClone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone)
                    })
                }
                return response
            })
            .catch(() => {
                return caches.match(event.request)
            })
    )
})

// 푸시 알림 수신
self.addEventListener('push', (event) => {
    if (!event.data) return

    let data
    try {
        data = event.data.json()
    } catch (e) {
        data = {
            title: 'Clean System',
            body: event.data.text(),
            icon: '/icons/icon-192.png',
        }
    }

    const options = {
        body: data.body || '',
        icon: data.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: {
            url: data.url || '/',
        },
        vibrate: [200, 100, 200],
        tag: data.tag || 'default',
        renotify: true,
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Clean System', options)
    )
})

// 알림 클릭 시 해당 페이지로 이동
self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const url = event.notification.data?.url || '/'

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 이미 열려있는 탭이 있으면 포커스
                for (const client of clientList) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus()
                    }
                }
                // 없으면 새 탭 열기
                if (self.clients.openWindow) {
                    return self.clients.openWindow(url)
                }
            })
    )
})
