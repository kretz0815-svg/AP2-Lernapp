export async function fetchYouTubeVideos(query, apiKey, maxResults = 4) {
    if (!apiKey) {
        console.warn("No YouTube API key provided.");
        return [];
    }

    try {
        const normalizedQuery = String(query || '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!normalizedQuery) {
            return [];
        }

        const dedupe = (arr) => [...new Set(arr.filter(Boolean))];
        const compactBase = normalizedQuery.split(' ').slice(0, 5).join(' ');
        const queryVariants = dedupe([
            normalizedQuery,
            `${normalizedQuery} einfach erklärt`,
            `${normalizedQuery} tutorial deutsch`,
            compactBase && `${compactBase} einfach erklärt`
        ]);

        const fetchSize = Math.min(Math.max(maxResults * 3, 8), 20);
        let data = null;

        for (const variant of queryVariants) {
            const safeQuery = encodeURIComponent(variant);
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${safeQuery}&maxResults=${fetchSize}&key=${apiKey}&relevanceLanguage=de`);

            if (!response.ok) {
                const errorData = await response.json();
                console.error("YouTube API Fehler:", errorData.error?.message || response.status);
                throw new Error(`YouTube API returned ${response.status}`);
            }

            const candidateData = await response.json();
            if ((candidateData?.items || []).length > 0) {
                data = candidateData;
                break;
            }
        }

        if (!data) {
            return [];
        }

        const normalizeForMatch = (value) => String(value || '')
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const queryTokens = normalizeForMatch(normalizedQuery)
            .toLowerCase()
            .split(/\s+/)
            .filter(token => token.length > 2);

        const scored = (data.items || [])
            .filter(item => item?.id?.videoId && item?.snippet)
            .map(item => {
                const title = item.snippet.title || '';
                const description = item.snippet.description || '';
                const channelTitle = item.snippet.channelTitle || '';
                const haystack = normalizeForMatch(`${title} ${description} ${channelTitle}`);
                const normalizedTitle = normalizeForMatch(title);

                const tokenHits = queryTokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
                const titleHits = queryTokens.reduce((sum, token) => sum + (normalizedTitle.includes(token) ? 1 : 0), 0);
                const eduBonus = /erklär|einfach|grundlagen|tutorial|lernvideo|wirtschaft|e-commerce|shop/i.test(haystack) ? 1 : 0;

                return {
                    item,
                    score: (titleHits * 2) + tokenHits + eduBonus
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map(({ item }) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelTitle: item.snippet.channelTitle,
                url: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1`
            }));

        return scored;
    } catch (error) {
        console.error("Error fetching YouTube videos:", error);
        return [];
    }
}
