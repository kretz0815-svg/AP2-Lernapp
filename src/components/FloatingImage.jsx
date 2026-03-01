import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const FloatingImage = ({ svgCode }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!svgCode) return null;

    return (
        <>
            <button
                className="fade-in hide-on-print"
                type="button"
                style={{
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    background: '#3b82f6',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '1rem auto 0 auto',
                    width: 'fit-content'
                }}
                onClick={() => setIsOpen(true)}
                title="Dazugehörige Grafik anzeigen"
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 6px 15px rgba(59, 130, 246, 0.6)';
                    e.currentTarget.style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(59, 130, 246, 0.4)';
                    e.currentTarget.style.background = '#3b82f6';
                }}
            >
                Organigramm
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="card-face fade-in" style={{
                        background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
                        borderRadius: '24px', border: '1px solid var(--glass-border)',
                        padding: '1.5rem', width: '90%', maxWidth: '1200px',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ color: 'white', margin: 0 }}>Zugehörige Grafik</h3>
                            <button
                                className="btn-secondary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '1rem' }}
                                onClick={() => setIsOpen(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="zoom-hint" style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '1rem' }}>
                            🔍 Mit 2 Fingern zoomen & verschieben
                        </div>

                        <div
                            className="svg-modal-content"
                            style={{
                                flex: 1,
                                overflow: 'hidden', /* Verhindert doppelte Scrollbars, Zoom-Komponente regelt Panning */
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px', padding: '1rem',
                                display: 'flex', justifyContent: 'center', alignItems: 'center'
                            }}
                        >
                            <TransformWrapper
                                initialScale={1}
                                minScale={0.5}
                                maxScale={4}
                                centerOnInit={true}
                                wheel={{ step: 0.1 }}
                            >
                                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                                    <div
                                        className="svg-container"
                                        dangerouslySetInnerHTML={{ __html: svgCode }}
                                    />
                                </TransformComponent>
                            </TransformWrapper>
                        </div>
                        <style>{`
                            .svg-container {
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                width: 100%;
                                height: 100%;
                            }
                            .svg-container svg {
                                max-width: 100%;
                                max-height: 100vh; /* Verhindert, dass das Bild ohne Zoom riesig ist */
                                height: auto;
                            }
                            @media (min-width: 769px) {
                                .zoom-hint {
                                    display: none; /* Hinweis auf Desktop ausblenden */
                                }
                            }
                        `}</style>
                    </div>
                </div>
            )}
        </>
    );
};

export default FloatingImage;
