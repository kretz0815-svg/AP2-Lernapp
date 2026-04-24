export async function fetchYouTubeVideos(query, maxResults = 4) {
    if (!query || !String(query).trim()) {
        return [];
    }

    try {
        const normalizedQuery = String(query || '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!normalizedQuery) {
            return [];
        }

        // Call our server-side proxy instead of YouTube directly (key stays on server)
        const res = await fetch('/api/youtube-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: normalizedQuery, maxResults })
        });

        if (!res.ok) {
            console.warn(`YouTube proxy returned ${res.status}`);
            return [];
        }

        const data = await res.json().catch(() => ({}));
        return Array.isArray(data?.videos) ? data.videos : [];
    } catch (error) {
        console.error("Error fetching YouTube videos:", error);
        return [];
    }
}