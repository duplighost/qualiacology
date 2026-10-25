// The game's service worker. It does nothing but exist: phones only offer "add to home screen"
// (and the Android app only runs full screen) for a page that has one. What's fresh stays the
// site's business.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
