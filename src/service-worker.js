/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkOnly, NetworkFirst } from 'workbox-strategies';

clientsClaim();

// Do NOT call skipWaiting() unconditionally here.
// The new SW will wait until the UI explicitly sends SKIP_WAITING,
// giving the user control over when the update is applied.

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

precacheAndRoute(self.__WB_MANIFEST);

/* precacheAndRoute above handles caching all build assets */
/* below we decide what happens on individual requests / fetches */

registerRoute("/", new NetworkFirst());
registerRoute("/privacy-policy/", new NetworkFirst());
registerRoute(({ url }) => url.hostname === 'cdn.jsdelivr.net', new StaleWhileRevalidate());
registerRoute("/reset/", new NetworkOnly());
registerRoute(({ url }) => url.href.includes('mp3quran'), new NetworkOnly());
// Always fetch version.json from the network so update checks are accurate.
registerRoute(({ url }) => url.pathname === '/version.json', new NetworkOnly());
