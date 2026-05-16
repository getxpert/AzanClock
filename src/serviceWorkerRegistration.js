import React from 'react';
import { toast } from 'react-toastify';

const isLocalhost = Boolean(window.location.hostname === 'localhost');

// Holds the SW registration so VersionService can call registration.update()
let _registration = null;

export function getRegistration() {
    return _registration;
}

export function register(onRegistered) {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swUrl = '/service-worker.js';

            if (!isLocalhost) {
                navigator.serviceWorker
                    .register(swUrl)
                    .then((registration) => {
                        _registration = registration;

                        // Notify VersionService (or any caller) that we have a registration.
                        if (onRegistered) onRegistered(registration);

                        registration.onupdatefound = () => {
                            const installingWorker = registration.installing;
                            if (!installingWorker) return;

                            installingWorker.onstatechange = () => {
                                if (
                                    installingWorker.state === 'installed' &&
                                    navigator.serviceWorker.controller
                                ) {
                                    // A new SW is installed and waiting.
                                    // Because service-worker.js calls skipWaiting() unconditionally,
                                    // the new SW will activate on its own.  We just need to reload
                                    // once it takes control (handled by controllerchange below).
                                    console.log('[SW] New version installed, waiting for activation.');
                                }
                            };
                        };
                    })
                    .catch((error) => {
                        console.error('Error during service worker registration:', error);
                    });

                // When the SW controller changes (new SW took over), reload the page
                // so the user gets the fresh assets.
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('[SW] Controller changed — reloading for new version.');

                    toast.success(
                        <div>
                            <strong>App updated!</strong>
                            <div style={{ fontSize: '0.85em', marginTop: 4 }}>
                                Reloading to apply the latest version…
                            </div>
                        </div>,
                        {
                            toastId: 'sw-updated',
                            autoClose: 2500,
                            onClose: () => window.location.reload(),
                        }
                    );

                    // Fallback: reload after 3 s even if the toast is dismissed early.
                    setTimeout(() => window.location.reload(), 3000);
                });
            } else {
                console.log('Running on localhost. SW is not registered.');
            }
        });
    }
}
