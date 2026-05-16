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
 *  - A callback (onUpdateAvailable) is invoked so the UI can show a banner.
 */

const STORAGE_KEY_LAST_VERSION = 'appVersion';
const STORAGE_KEY_LAST_RELEASE = 'appReleaseDate';

// How often to poll /version.json (ms).  Default: every 30 minutes.
const POLL_INTERVAL_MS = 30 * 60 * 1000;

class VersionService {
    constructor() {
        this._pollTimer = null;
        this._onUpdateAvailable = null;
        this._registration = null; // ServiceWorkerRegistration reference
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
     * Call once on app startup.
     *
     * @param {Function} onUpdateAvailable  Called with { version, releaseDate, releaseNotes }
     *                                      when a newer version is available on the server.
     * @param {ServiceWorkerRegistration}  [registration]  Optional SW registration so we can
     *                                      trigger an update check directly.
     */
    initialize(onUpdateAvailable, registration = null) {
        this._onUpdateAvailable = onUpdateAvailable;
        this._registration = registration;

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
     * Store the running version in localStorage so we can detect a fresh
     * update on the next launch.
     */
    _recordCurrentVersion() {
        const stored = localStorage.getItem(STORAGE_KEY_LAST_VERSION);
        const current = this.currentVersion;

        if (stored && stored !== current) {
            // The app just updated itself silently via the SW.
            // We could show a "you're now on vX.Y.Z" notice here if desired.
            console.log(`[VersionService] Updated from ${stored} to ${current}`);
        }

        localStorage.setItem(STORAGE_KEY_LAST_VERSION, current);
        localStorage.setItem(STORAGE_KEY_LAST_RELEASE, this.currentReleaseDate);
    }

    /**
     * Fetch /version.json and compare against the running version.
     * If the server has a newer version, invoke the callback and nudge the SW.
     */
    async checkForUpdate() {
        try {
            // Cache-bust so we always get the latest file from the server.
            const url = `/version.json?_=${Date.now()}`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) return;

            const data = await response.json();
            const serverVersion = data.version || '0.0.0';
            const serverDate = data.releaseDate || '1970-01-01';

            if (this._isNewer(serverVersion, serverDate)) {
                console.log(`[VersionService] New version available: ${serverVersion} (${serverDate})`);

                // Tell the SW to check for updates — this triggers onupdatefound
                // in serviceWorkerRegistration.js which will reload the page.
                if (this._registration) {
                    this._registration.update().catch(() => {});
                }

                if (this._onUpdateAvailable) {
                    this._onUpdateAvailable({
                        version: serverVersion,
                        releaseDate: serverDate,
                        releaseNotes: data.releaseNotes || '',
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
            version: localStorage.getItem(STORAGE_KEY_LAST_VERSION) || this.currentVersion,
            releaseDate: localStorage.getItem(STORAGE_KEY_LAST_RELEASE) || this.currentReleaseDate,
        };
    }
}

export const versionService = new VersionService();
