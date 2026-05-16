import React from 'react'

const calibri = "'Calibri', 'Calibri Light', 'Candara', 'Segoe UI', sans-serif"

export default function HadithDisplay({ dailyHadith, hadithExpanded, setHadithExpanded, hadithLang = 'both', profile, PROFILE, TOP_BAR, SIDE_TOTAL_R, dim }) {
    if (!dailyHadith || !PROFILE.hadithW) return null

    const showArabic  = hadithLang === 'arabic'  || hadithLang === 'both'
    const showEnglish = hadithLang === 'english' || hadithLang === 'both'

    // In English-only mode the collapsed hint says "tap to expand" since there's no translation to reveal
    const collapsedHint = showEnglish && !showArabic ? 'tap to expand' : 'tap to read translation'

    return (
        <div
            onClick={() => setHadithExpanded(e => !e)}
            style={{
                position: 'fixed',
                top: TOP_BAR + 10,
                right: profile === 'portable-landscape' ? 10 : SIDE_TOTAL_R + 10,
                width: PROFILE.hadithW,
                ...(profile === 'portable-landscape'
                    ? {
                        left: 'calc((100vw + 91vh) / 2 + 8px)',
                        right: 10,
                        width: 'auto',
                    }
                    : {}
                ),
                background: 'rgba(0,0,0,0.72)',
                borderRadius: 10,
                border: '1px solid rgba(74,222,128,0.25)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 102,
                padding: '16px 20px',
                gap: 12,
                overflow: 'visible',
                fontFamily: calibri,
                textShadow: '0 1px 4px rgba(0,0,0,0.95)',
                pointerEvents: 'auto',
                cursor: 'pointer',
                userSelect: 'none',
                opacity: dim === 1 ? 0.25 : 1,
            }}>
            {/* Arabic hadith text — shown when lang is arabic or both */}
            {showArabic && (
                <span style={{
                    color: 'white',
                    fontSize: 'clamp(20px, 2.0vw, 26px)',
                    lineHeight: 1.75,
                    textAlign: 'right',
                    direction: 'rtl',
                    wordBreak: 'break-word',
                }}>{dailyHadith.arabic}</span>
            )}

            {/* English translation + reference — only shown when expanded */}
            {hadithExpanded && (<>
                {/* Divider — only when both languages are visible */}
                {showArabic && showEnglish && (
                    <div style={{
                        width: '100%', height: 1,
                        background: 'rgba(255,255,255,0.15)',
                    }} />
                )}

                {/* English translation */}
                {showEnglish && (
                    <span style={{
                        color: 'white',
                        fontSize: 'clamp(18px, 1.8vw, 24px)',
                        lineHeight: 1.5,
                        textAlign: 'left',
                        direction: 'ltr',
                        wordBreak: 'break-word',
                        fontStyle: 'italic',
                    }}>{dailyHadith.english}</span>
                )}

                {/* Reference + Type — always in yellow English */}
                <span style={{
                    color: '#fbbf24',
                    fontSize: 'clamp(18px, 1.7vw, 22px)',
                    lineHeight: 1.3,
                    textAlign: 'left',
                    direction: 'ltr',
                    fontWeight: 'bold',
                    marginTop: 2,
                }}>{dailyHadith.type && `${dailyHadith.type} · `}{dailyHadith.reference}</span>
            </>)}

            {/* Collapsed hint — shown only when not expanded */}
            {!hadithExpanded && (
                <span style={{
                    color: 'rgba(251,191,36,0.7)',
                    fontSize: 'clamp(13px, 1.3vw, 16px)',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    flexShrink: 0,
                }}>{collapsedHint}</span>
            )}
        </div>
    )
}
