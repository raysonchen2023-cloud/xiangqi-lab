// Native migration worker: the installed package owns executable assets.
// ChatGPT 2026-11-19: retire old PWA caches without deleting player storage.
// No fetch handler: after migration requests go to Capacitor's local server.
self.addEventListener("install", e => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", e => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith("xqlab-app-")).map(k => caches.delete(k)));
  await self.registration.unregister();
  const pages = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(pages.filter(p => new URL(p.url).origin === self.location.origin)
    .map(p => p.navigate(p.url).catch(() => {})));
})()));
