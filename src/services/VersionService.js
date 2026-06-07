/**
 * VersionService
 *
 * Tracks the running app version and detects when a newer version has been
 * deployed to the server.
 *
 * Strategy:
 *  - The current build version + release date are embedded at build time via
 *    package.json fields (read through process.env.REACT_APP_VERSION /
 *    REACT_APP_RELEASE_DATE).
 *  - On startup the service compares the running version against the last
 *    version stored in localStorage.  If they differ the app just updated
 *    itself (SW already swapped) and we can show a "what's new" notice.
 *  - Periodically the service fetches /version.json from the server.  If the
 *    server reports a version newer than what is running, the service worker
 *    is told to check for updates.  The SW registration's onupdatefound /
 *    controllerchange flow then handles the actual reload.
 *  - A callback (onUpdateAvailable) is invoked so the UI can show a prompt.
 *  - If the user dismisses the prompt for a given server version, that version
 *    is stored in localStorage and the prompt will not reappear until a
 *    different (newer) version is deployed.
 */

const STORAGE_KEY_LAST_VERSION  = 'appVersion';
const STORAGE_KEY_LAST_RELEASE  = 'appReleaseDate';
const STORAGE_KEY_SNOOZED       = 'updateSnoozedVersion';

// How often to poll /version.json (ms).  Default: every 30 minutes.
const POLL_INTERVAL_MS = 30 * 60 * 1000;

class VersionService {
    constructor() {
        this._pollTimer          = null;
        this._onUpdateAvailable  = null;
        this._registration       = null; // ServiceWorkerRegistration reference
        this._latestServerInfo   = null; // Last fetched server version info
    }

    /**
     * Returns the version baked into this build.
     * Falls back to package.json version field via REACT_APP_VERSION.
     */
    get currentVersion() {
        return process.env.REACT_APP_VERSION || '0.0.0';
    }

    /**
     * Returns the release date baked into this build (YYYY-MM-DD).
     */
    get currentReleaseDate() {
        return process.env.REACT_APP_RELEASE_DATE || '1970-01-01';
    }

    /**
     * Returns the latest server version info fetched, or null if not yet fetched.
     * { version, releaseDate, releaseNotes }
     */
    get latestServerInfo() {
        return this._latestServerInfo;
    }

    /**
     * Returns true if there is a newer version available on the server that
     * the user has not yet snoozed.
     */
    get hasUnacknowledgedUpdate() {
        if (!this._latestServerInfo) return false;
        const { version, releaseDate } = this._latestServerInfo;
        return this._isNewer(version, releaseDate) && !this._isSnoozed(version);
    }

    /**
     * Call once on app startup.
     *
     * @param {Function} onUpdateAvailable  Called with { version, releaseDate, releaseNotes }
     *                                      when a newer version is available on the server
     *                                      and the user has not snoozed that version.
     * @param {ServiceWorkerRegistration}  [registration]  Optional SW registration so we can
     *                                      trigger an update check directly.
     */
    initialize(onUpdateAvailable, registration = null) {
        this._onUpdateAvailable = onUpdateAvailable;
        this._registration      = registration;

        this._recordCurrentVersion();
        this._startPolling();
    }

    /**
     * Update the SW registration reference after it becomes available.
     * Called from index.js once the SW has registered.
     */
    setRegistration(registration) {
        this._registration = registration;
    }

    /**
     * Actively apply the waiting service worker update and reload the page.
     *
     * Strategy (in order):
     *  1. If there's already a waiting SW, post SKIP_WAITING → controllerchange reloads.
     *  2. Call registration.update() to fetch the new SW, wait up to 15 s for it
     *     to reach 'installed', then post SKIP_WAITING.
     *  3. If no SW is available (dev mode, or SW not supported), do a hard
     *     cache-busting reload so the browser fetches fresh assets.
     */
    async triggerUpdate() {
        const reg = this._registration;

        // Post SKIP_WAITING to a waiting worker and set up a reload safety-net.
        const activateWaiting = (registration) => {
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                // controllerchange in serviceWorkerRegistration.js will reload.
                // Safety-net: reload after 4 s regardless.
                setTimeout(() => window.location.reload(), 4000);
                return true;
            }
            return false;
        };

        if (!reg) {
            // No SW (dev mode or unsupported) — hard reload with cache-bust.
            this._hardReload();
            return;
        }

        // 1. Already waiting?
        if (activateWaiting(reg)) return;

        // 2. Trigger a fresh SW fetch and wait for it to install.
        try {
            await reg.update();

            // Give the SW up to 15 s to download and reach 'installed'.
            await new Promise((resolve) => {
                // Check immediately in case update() resolved with a waiting worker.
                if (reg.waiting || reg.installing) {
                    const worker = reg.waiting || reg.installing;
                    if (reg.waiting) { resolve(); return; }
                    worker.addEventListener('statechange', function handler() {
                        if (worker.state === 'installed' || worker.state === 'activated') {
                            worker.removeEventListener('statechange', handler);
                            resolve();
                        }
                    });
                } else {
                    // onupdatefound will fire when the new SW starts installing.
                    reg.addEventListener('updatefound', function handler() {
                        reg.removeEventListener('updatefound', handler);
                        const installing = reg.installing;
                        if (!installing) { resolve(); return; }
                        installing.addEventListener('statechange', function sh() {
                            if (installing.state === 'installed' || installing.state === 'activated') {
                                installing.removeEventListener('statechange', sh);
                                resolve();
                            }
                        });
                    });
                }
                setTimeout(resolve, 15000);
            });

            if (activateWaiting(reg)) return;
        } catch (e) {
            console.warn('[VersionService] SW update failed:', e);
        }

        // 3. Fallback: hard reload.
        this._hardReload();
    }

    /** Hard reload that bypasses the browser cache. */
    _hardReload() {
        // location.reload(true) is deprecated but still works in most browsers.
        // As a belt-and-suspenders measure we also unregister the SW first so
        // the next load fetches everything fresh from the network.
        try {
            if (this._registration) {
                this._registration.unregister().finally(() => window.location.reload());
                return;
            }
        } catch (e) { /* ignore */ }
        window.location.reload();
    }

    /**
     * Record that the user dismissed the update prompt for the given version.
     * The prompt will not reappear until a different (newer) version is deployed.
     */
    snoozeUpdate(version) {
        localStorage.setItem(STORAGE_KEY_SNOOZED, version);
    }

    /**
     * Clear any snoozed version so the prompt can reappear.
     */
    clearSnooze() {
        localStorage.removeItem(STORAGE_KEY_SNOOZED);
    }

    /**
     * Store the running version in localStorage so we can detect a fresh
     * update on the next launch.
     */
    _recordCurrentVersion() {
        const stored  = localStorage.getItem(STORAGE_KEY_LAST_VERSION);
        const current = this.currentVersion;

        if (stored && stored !== current) {
            // The app just updated itself silently via the SW.
            console.log(`[VersionService] Updated from ${stored} to ${current}`);
            // Clear any snooze for the old version now that we've updated.
            this.clearSnooze();
        }

        localStorage.setItem(STORAGE_KEY_LAST_VERSION, current);
        localStorage.setItem(STORAGE_KEY_LAST_RELEASE, this.currentReleaseDate);
    }

    /**
     * Returns true if the user has already snoozed this specific server version.
     */
    _isSnoozed(serverVersion) {
        return localStorage.getItem(STORAGE_KEY_SNOOZED) === serverVersion;
    }

    /**
     * Fetch /version.json and compare against the running version.
     * If the server has a newer version, invoke the callback and nudge the SW.
     */
    async checkForUpdate() {
        try {
            // Cache-bust so we always get the latest file from the server.
            const url      = `/version.json?_=${Date.now()}`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) return;

            const data          = await response.json();
            const serverVersion = data.version     || '0.0.0';
            const serverDate    = data.releaseDate  || '1970-01-01';
            const releaseNotes  = data.releaseNotes || '';

            // Always cache the latest server info so the Settings panel can display it.
            this._latestServerInfo = { version: serverVersion, releaseDate: serverDate, releaseNotes };

            if (this._isNewer(serverVersion, serverDate)) {
                console.log(`[VersionService] New version available: ${serverVersion} (${serverDate})`);

                // Tell the SW to check for updates — this triggers onupdatefound
                // in serviceWorkerRegistration.js which will reload the page.
                if (this._registration) {
                    this._registration.update().catch(() => {});
                }

                // Only fire the callback if the user hasn't already snoozed this version.
                if (!this._isSnoozed(serverVersion) && this._onUpdateAvailable) {
                    this._onUpdateAvailable({
                        version:      serverVersion,
                        releaseDate:  serverDate,
                        releaseNotes: releaseNotes,
                    });
                }
            }
        } catch (err) {
            // Network errors are expected when offline — silently ignore.
        }
    }

    /**
     * Returns true if serverVersion / serverDate is strictly newer than what
     * is currently running.
     */
    _isNewer(serverVersion, serverDate) {
        // Compare by semver parts first, then fall back to date comparison.
        const toInts = (v) => v.split('.').map((n) => parseInt(n, 10) || 0);
        const [sM, sm, sp] = toInts(serverVersion);
        const [cM, cm, cp] = toInts(this.currentVersion);

        if (sM !== cM) return sM > cM;
        if (sm !== cm) return sm > cm;
        if (sp !== cp) return sp > cp;

        // Same semver — compare release dates as ISO strings (lexicographic is fine for YYYY-MM-DD).
        return serverDate > this.currentReleaseDate;
    }

    _startPolling() {
        // Check immediately on startup, then on the interval.
        this.checkForUpdate();
        this._pollTimer = setInterval(() => this.checkForUpdate(), POLL_INTERVAL_MS);
    }

    stop() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
    }

    /** Expose stored version info for display in the UI if needed. */
    getStoredVersionInfo() {
        return {
            version:     localStorage.getItem(STORAGE_KEY_LAST_VERSION) || this.currentVersion,
            releaseDate: localStorage.getItem(STORAGE_KEY_LAST_RELEASE) || this.currentReleaseDate,
        };
    }
}

export const versionService = new VersionService();
