const CACHE_NAME = 'dashboard-v202607181037';
const urlsToCache = [
  'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js'
];

// 安装时缓存静态资源 + 立即激活
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 拦截请求：HTML 始终走网络（no-store），静态资源缓存优先
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTML = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  
  if (isHTML) {
    // HTML 页面：强制走网络，绝不使用缓存
    event.respondWith(
      fetch(new Request(event.request, { cache: 'no-store' }))
        .then(response => response)
        .catch(() => caches.match(event.request).then(r => r || Response.error()))
    );
  } else {
    // 静态资源（JS/CSS/图片/图标）：缓存优先，加速加载
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
  }
});

// 激活时清理旧缓存 + 立即接管所有页面
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
