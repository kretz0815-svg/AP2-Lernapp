import React from 'react';

const VideoPanel = ({
    isOpen,
    isLoading,
    videos,
    error,
    selectedVideo,
    onSelectVideo,
    onCloseVideo
}) => {
    if (!isOpen) return null;

    // Handles both string URLs and video objects (including predefined ones)
    const getVideoSrc = (video) => {
        if (!video) return null;
        if (typeof video === 'string') return video;
        if (video.id?.startsWith('predefined_')) {
            return `https://www.youtube.com/embed/${video.id.replace('predefined_', '')}?autoplay=1`;
        }
        return video.url;
    };

    const currentSrc = getVideoSrc(selectedVideo);

    return (
        <div className="fade-in" style={{ marginBottom: '1.5rem', width: '100%' }}>
            {!selectedVideo ? (
                <>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                            Suche passende Videos... ⏳
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {videos && videos.length > 0 ? (
                                videos.map((video) => (
                                    <div
                                        key={video.id || video.url}
                                        className="video-thumbnail-card"
                                        onClick={() => onSelectVideo(video)}
                                        style={{ background: 'var(--glass-bg)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--glass-border)', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                                    >
                                        <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                                        <div style={{ padding: '0.8rem' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white', marginBottom: '0.4rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {video.title}
                                            </div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{video.channelTitle}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                                    {error || 'Keine Videos gefunden oder API-Key fehlt.'}
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div style={{ background: 'black', borderRadius: '16px', overflow: 'hidden', position: 'relative', paddingTop: '56.25%', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
                    {/* Top Bar matching Wisor's implementation */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.8)', alignItems: 'center', zIndex: 10 }}>
                        <span style={{ color: 'white', fontSize: '0.9rem' }}>Video-Player</span>
                        <button className="btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '8px' }} onClick={onCloseVideo}>
                            ← Andere Videos
                        </button>
                    </div>
                    <iframe
                        src={currentSrc}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    ></iframe>
                </div>
            )}
        </div>
    );
};

export default VideoPanel;
