import React, { useContext, createRef, useRef, useEffect, useState } from 'react'
import Address from './Address';
import DropDown from './DropDown';
import Options from './Options';
import { AzanCallOptions } from '../data/AzanCallOptions';
import { DeviceModes } from '../data/DeviceModes';
import { FajrAzans, Azans } from '../data/Audios';
import { CalculationMethods, AsrCalculationMethods } from '../data/CalculationMethods';
import { AppContext } from '../AppContext';
import { FontAwesome } from '../data/FontAwesome';
import { format12 } from '../scripts/SmartAzanClock';
import defaultTempColours from '../data/temperatureColours.json';
import { versionService } from '../services/VersionService';

export default function Settings() {

    const { vakits, arcVakits, calculationSettings, locationSettings, deviceSettings, azanSettings,
        offsetSettings, updateOffset, previewAudio, oneThirdTime, twoThirdTime, midnightTime,
        updateInfo, setShowUpdateModal } = useContext(AppContext)

    // Load temperature colour bands from localStorage (falls back to bundled defaults)
    const loadTempColours = () => {
        try {
            const stored = localStorage.getItem('temperatureColours');
            if (stored) return JSON.parse(stored);
        } catch (e) { /* ignore */ }
        return defaultTempColours;
    };
    const [tempColours, setTempColours] = useState(loadTempColours);

    const CalculationMethodValues = [];
    Object.keys(CalculationMethods).forEach(k => {
        CalculationMethodValues.push({ id: k, name: CalculationMethods[k].name });
    })

    const isRamadan = new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'numeric' }).format(new Date()) === '9';
    const azanEnabled = deviceSettings.azanCallsEnabled === 'Y';
    const azanSettingsHTML = [];
    const Vakits = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    Vakits.map((item) => {

        let cVakit = item.toLowerCase();
        let azanValue = azanSettings[cVakit];
        let offsetValue = offsetSettings[cVakit];
        let values = (item === "Fajr") ? FajrAzans : Azans;
        let vTime = vakits.find(v => v.name === item).displayTime;

        azanSettingsHTML.push(

            <div key={item} className="mt-2">

                <div className='d-flex flex-row justify-content-between'>
                    <div><span className='badge p-0'>{item} Azan @ {vTime}</span></div>
                    <div className='col-4'><span className='badge'>Minute Offset</span></div>
                </div>

                <div className='d-flex flex-row gap-1'>

                    <div className='col-6'>
                        <DropDown name={'azanSettings.' + cVakit} selectedValue={azanValue} values={values} disabled={!azanEnabled} />
                    </div>
                    <div className='col-2'>
                        <button onClick={() => { previewAudio(azanValue * 1); document.activeElement.blur(); }}
                            type='button'
                            disabled={!azanEnabled}
                            className='btn btn-sm btn-primary col-12'>{FontAwesome.Play}</button>
                    </div>
                    <div>
                        <div className='d-flex flex-row gap-1 align-items-center'>
                            <div className='col-4'><button type='button' onClick={() => { updateOffset(cVakit, '-'); document.activeElement.blur(); }} className='btn btn-sm btn-light col-12'>{FontAwesome.Minus}</button></div>
                            <div className='col-4'><button type='button' onClick={() => { updateOffset(cVakit, '0'); document.activeElement.blur(); }} className={'btn btn-sm col-12 ' + ((offsetValue === 0) ? 'btn-light' : 'btn-danger')}>{offsetValue}</button></div>
                            <div className='col-4'><button type='button' onClick={() => { updateOffset(cVakit, '+'); document.activeElement.blur(); }} className='btn btn-sm btn-light col-12'>{FontAwesome.Plus}</button></div>
                        </div>
                    </div>
                </div>

            </div >

        )
    })

    return (
        <div>

            {isRamadan && <div className='alert alert-warning p-2 mb-2' style={{ fontSize: '0.85rem' }}>
                🌙 <strong>Ramadan Tip:</strong> Many people add a few extra minutes to the Maghrib offset during Ramadan to ensure sunset has fully occurred. May Allah accept all our fasting. 🤲
            </div>}

            <Address value={locationSettings.address} />

            <div className="mt-2">
                <span className='badge mb-1 p-0'>Calculation Method</span>
                <DropDown name="calculationSettings.method" selectedValue={calculationSettings.method} values={CalculationMethodValues} />
            </div>

            <div className="mt-2">
                <span className='badge mb-1 p-0'>Asr Calculation Method</span>
                <Options name="calculationSettings.asrMethod" selectedValue={calculationSettings.asrMethod} values={AsrCalculationMethods} />
            </div>

            <div className="mt-2">
                <span className='badge mb-1 p-0'>Display Profile</span>
                <Options name="deviceSettings.displayProfile" selectedValue={deviceSettings.displayProfile || 'desktop'}
                    values={[
                        { id: 'desktop',            name: '🖥️ Desktop (Landscape)' },
                        { id: 'portable-landscape', name: '📱 Portable Landscape'   },
                        { id: 'portable-portrait',  name: '📱 Portable Portrait'    },
                    ]} />
            </div>

            <div className="mt-2">
                <span className='badge mb-1 p-0'>Display Mode</span>
                <Options name="deviceSettings.mode" selectedValue={deviceSettings.mode} values={DeviceModes} />
            </div>

            <div className="mt-2">
                <span className='badge mb-1 p-0'>Clock Style</span>
                <Options name="deviceSettings.clockStyle" selectedValue={deviceSettings.clockStyle}
                    values={[
                        { id: 'A', name: '🕐 Analogue' },
                        { id: 'D', name: '🔢 Digital'  }
                  
                    ]} />
            </div>

            <div className="mt-2">
                <span className='badge mb-1 p-0'>Time Format</span>
                <Options name="deviceSettings.timeFormat" selectedValue={deviceSettings.timeFormat || '12'}
                    values={[
                        { id: '12', name: '🕛 12-hour' },
                        { id: '24', name: '🕐 24-hour' },
                    ]} />
            </div>

            <div className="mt-2">
                <span className='badge mb-1 p-0'>Events in Sidebar</span>
                <Options name="deviceSettings.eventsCount" selectedValue={String(deviceSettings.eventsCount ?? 3)}
                    values={[
                        { id: '1', name: '1 event'  },
                        { id: '2', name: '2 events' },
                        { id: '3', name: '3 events' },
                        { id: '4', name: '4 events' },
                        { id: '5', name: '5 events' },
                    ]} />
            </div>

            <div className="mt-2">
                <span className='badge mb-1 p-0'>Hadith Language</span>
                <Options name="deviceSettings.hadithLang" selectedValue={deviceSettings.hadithLang || 'both'}
                    values={[
                        { id: 'arabic',  name: '🕌 Arabic only'  },
                        { id: 'english', name: '🌐 English only' },
                        { id: 'both',    name: '🌍 Both'         },
                    ]} />
            </div>

            <div className="mt-2">
                <span className='badge mb-1 p-0'>Enable Azan Calls & Alarms</span>
                <Options name="deviceSettings.azanCallsEnabled" selectedValue={deviceSettings.azanCallsEnabled} values={AzanCallOptions} />
            </div>

            {azanSettingsHTML}

            <div className='d-flex flex-row justify-content-start gap-2 mt-3'>
                <div className='badge bg-secondary p-1'>Imsak @ {format12(arcVakits.find(f => f.name == 'Imsak').time)}</div>
                <div className='badge bg-secondary p-1'>Duha @ {format12(arcVakits.find(f => f.name == 'Duha').time)} - {format12(arcVakits.find(f => f.name == 'Duhaend').time)}</div>
            </div>
            <div className='d-flex flex-row justify-content-start gap-2 mt-2'>
                <div className='badge bg-secondary p-1'>1/3 @ {format12(oneThirdTime)}</div>
                <div className='badge bg-secondary p-1'>Midnight @ {format12(midnightTime)}</div>
                <div className='badge bg-secondary p-1'>2/3 @ {format12(twoThirdTime)}</div>
            </div>

            {/* ── Temperature Colour Bands ─────────────────────────────────── */}
            <div className="mt-3">
                <div className='d-flex flex-row align-items-center gap-2 mb-2'>
                    <span className='badge p-0'>Temperature Colour Bands (°C symbol)</span>
                    <button className='btn btn-sm btn-outline-secondary py-0 px-1' style={{ fontSize: '0.65rem', lineHeight: 1.4 }}
                        onClick={() => {
                            setTempColours(defaultTempColours);
                            localStorage.removeItem('temperatureColours');
                        }}>Reset to defaults</button>
                </div>                {(() => {
                    const BAR_MIN = -5;
                    const BAR_MAX = 45;
                    const BAR_RANGE = BAR_MAX - BAR_MIN;

                    // Build sorted bands (ascending by min, clamped to bar range)
                    const sortedBands = (tempColours.bands || [])
                        .filter(b => b.min !== -999)
                        .slice()
                        .sort((a, b) => a.min - b.min);

                    // Build gradient stops: each band fills from its min to the next band's min
                    const gradientStops = sortedBands.map((band, i) => {
                        const next = sortedBands[i + 1];
                        const startPct = Math.max(0, Math.min(100, ((band.min - BAR_MIN) / BAR_RANGE) * 100));
                        const endPct   = next
                            ? Math.max(0, Math.min(100, ((next.min - BAR_MIN) / BAR_RANGE) * 100))
                            : 100;
                        return `${band.unit} ${startPct.toFixed(1)}%, ${band.unit} ${endPct.toFixed(1)}%`;
                    });
                    const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`;

                    // Tick marks to show on the bar (every 5°C)
                    const ticks = [];
                    for (let t = BAR_MIN; t <= BAR_MAX; t += 5) {
                        ticks.push(t);
                    }

                    // Find which band index a given temp belongs to (for the colour picker)
                    const getBandIndex = (temp) => {
                        const desc = (tempColours.bands || []).slice().sort((a, b) => b.min - a.min);
                        for (let i = 0; i < desc.length; i++) {
                            if (temp >= desc[i].min) {
                                // map back to original index
                                return tempColours.bands.findIndex(b => b.min === desc[i].min);
                            }
                        }
                        return -1;
                    };

                    return (
                        <div style={{ fontSize: '0.8rem' }}>
                            {/* Gradient bar */}
                            <div style={{ position: 'relative', marginBottom: 28 }}>
                                <div style={{
                                    height: 28,
                                    borderRadius: 6,
                                    background: gradient,
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    position: 'relative',
                                }}>
                                    {/* Colour pickers — one per band, positioned at band midpoint */}
                                    {sortedBands.map((band, i) => {
                                        const next = sortedBands[i + 1];
                                        const startPct = Math.max(0, Math.min(100, ((band.min - BAR_MIN) / BAR_RANGE) * 100));
                                        const endPct   = next
                                            ? Math.max(0, Math.min(100, ((next.min - BAR_MIN) / BAR_RANGE) * 100))
                                            : 100;
                                        const midPct = (startPct + endPct) / 2;
                                        const origIdx = getBandIndex(band.min);
                                        return (
                                            <label key={i} title={`${band.label} (${band.min === -999 ? '< 0' : `≥ ${band.min}`}°C) — click to change colour`}
                                                style={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: `${midPct}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                <span style={{
                                                    fontSize: '0.6rem',
                                                    color: 'rgba(255,255,255,0.85)',
                                                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                                    whiteSpace: 'nowrap',
                                                    pointerEvents: 'none',
                                                    userSelect: 'none',
                                                }}>{band.label}</span>
                                                <input type='color' value={band.unit}
                                                    style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                                                    onChange={(e) => {
                                                        if (origIdx < 0) return;
                                                        const updated = {
                                                            ...tempColours,
                                                            bands: tempColours.bands.map((b, j) =>
                                                                j === origIdx ? { ...b, unit: e.target.value } : b
                                                            )
                                                        };
                                                        setTempColours(updated);
                                                        localStorage.setItem('temperatureColours', JSON.stringify(updated));
                                                    }} />
                                            </label>
                                        );
                                    })}
                                </div>

                                {/* Temperature labels below the bar */}
                                <div style={{ position: 'relative', height: 18, marginTop: 2 }}>
                                    {ticks.map(t => {
                                        const pct = ((t - BAR_MIN) / BAR_RANGE) * 100;
                                        return (
                                            <span key={t} style={{
                                                position: 'absolute',
                                                left: `${pct}%`,
                                                transform: 'translateX(-50%)',
                                                fontSize: '0.6rem',
                                                color: 'rgba(255,255,255,0.6)',
                                                whiteSpace: 'nowrap',
                                            }}>{t}°</span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Hint */}

                        </div>
                    );
                })()}
            </div>

            {/* ── App Version ──────────────────────────────────────────────── */}
            {(() => {
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
                    } catch { return iso; }
                };
                const hasUpdate = updateInfo && versionService.hasUnacknowledgedUpdate;
                return (
                    <div className='mt-4 pt-3' style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className='d-flex flex-row justify-content-between align-items-center'>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                                <span>App v{installed.version}</span>
                                <span className='mx-1'>·</span>
                                <span>{formatDate(installed.releaseDate)}</span>
                            </div>
                            {hasUpdate && (
                                <button
                                    className='btn btn-sm btn-success py-0 px-2'
                                    style={{ fontSize: '0.75rem' }}
                                    onClick={() => setShowUpdateModal(true)}
                                >
                                    ⬆ Update Available v{updateInfo.version}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

        </div >
    )
}
