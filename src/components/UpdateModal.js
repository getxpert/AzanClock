import React, { useState } from 'react';
import { versionService } from '../services/VersionService';

/**
 * UpdateModal
 *
 * Shown when a newer version is available on the server.
 * Displays both the installed version and the new version with their compile
 * dates, then lets the user update now or dismiss (snooze until a different
 * version is deployed).
 */
export default function UpdateModal({ show, updateInfo, onUpdate, onDismiss }) {
    const [updating, setUpdating] = useState(false);

    if (!show || !updateInfo) return null;

    const installed = {
        version:     versionService.currentVersion,
        releaseDate: versionService.currentReleaseDate,
    };

    const formatDate = (iso) => {
        if (!iso || iso === '1970-01-01') return '—';
        try {
            return new Date(iso).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
            });
        } catch {
            return iso;
        }
    };

    return (
        /* Backdrop */
        <div
            style={{
                position: 'fixed', inset: 0,
                backgroundColor: 'rgba(0,0,0,0.65)',
                zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            {/* Dialog */}
            <div
                style={{
                    backgroundColor: '#1e1e2e',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: '1.5rem',
                    maxWidth: 380,
                    width: '100%',
                    color: '#e0e0e0',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
            >
                {/* Header */}
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                    🔄 Update Available
                </div>

                {/* Version comparison table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    <thead>
                        <tr style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                            <th style={{ paddingBottom: 4, fontWeight: 500 }}></th>
                            <th style={{ paddingBottom: 4, fontWeight: 500 }}>Version</th>
                            <th style={{ paddingBottom: 4, fontWeight: 500 }}>Compile Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ paddingRight: 8, color: 'rgba(255,255,255,0.55)', paddingBottom: 6 }}>Installed</td>
                            <td style={{ paddingRight: 8, paddingBottom: 6 }}>v{installed.version}</td>
                            <td style={{ paddingBottom: 6 }}>{formatDate(installed.releaseDate)}</td>
                        </tr>
                        <tr>
                            <td style={{ paddingRight: 8, color: '#4ade80', fontWeight: 600 }}>New</td>
                            <td style={{ paddingRight: 8, color: '#4ade80', fontWeight: 600 }}>v{updateInfo.version}</td>
                            <td style={{ color: '#4ade80', fontWeight: 600 }}>{formatDate(updateInfo.releaseDate)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Release notes */}
                {updateInfo.releaseNotes && (
                    <div style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.6)',
                        marginBottom: '1rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 6,
                        borderLeft: '3px solid #4ade80',
                    }}>
                        {updateInfo.releaseNotes}
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => {
                            setUpdating(true);
                            onUpdate();
                        }}
                        disabled={updating}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            backgroundColor: updating ? '#15803d' : '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: updating ? 'default' : 'pointer',
                            fontSize: '0.9rem',
                            opacity: updating ? 0.8 : 1,
                        }}
                    >
                        {updating ? '⏳ Updating…' : '✅ Update Now'}
                    </button>
                    <button
                        onClick={onDismiss}
                        disabled={updating}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: '#e0e0e0',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: 8,
                            cursor: updating ? 'default' : 'pointer',
                            fontSize: '0.9rem',
                            opacity: updating ? 0.4 : 1,
                        }}
                    >
                        Not Now
                    </button>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.6rem', textAlign: 'center' }}>
                    You won't be asked again until a newer version is deployed.
                </div>
            </div>
        </div>
    );
}
