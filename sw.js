    // sw.js
    self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('forgepass-static-v1').then((cache) => {
        return cache.addAll([
            '/',
            '/menu.html',
            '/perfil.html',
            '/styles.css',
            '/script.js',
            '/logo.png'
        ]);
        })
    );
    });

    self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
        return response || fetch(event.request);
        })
    );
    });