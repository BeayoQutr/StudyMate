var CACHE_NAME = "studymate-static-v1";

var STATIC_ASSETS = [
  "/",
  "/login",
  "/style.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icons/icon.svg"
];

// ====== install: 预缓存所有静态资源 ======
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function (err) {
        console.error("[SW] 预缓存失败:", err);
      });
    })
  );
  // 立即激活，不等待旧 SW
  self.skipWaiting();
});

// ====== activate: 清理旧版本缓存 ======
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );
  // 立即接管所有页面
  self.clients.claim();
});

// ====== fetch: 不缓存任何 /api/ 请求 ======
self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);

  // /api/ 路径：完全透传，不读缓存，不写缓存
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 只处理 GET 请求
  if (event.request.method !== "GET") {
    return;
  }

  // 静态资源：缓存优先（CACHE_FIRST）
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function (response) {
        // 只缓存成功的响应
        if (response && response.status === 200 && response.type === "basic") {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});